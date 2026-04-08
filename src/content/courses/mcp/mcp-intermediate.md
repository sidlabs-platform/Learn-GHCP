---
title: "Build a Custom stdio MCP Server"
description: "Create your own MCP server using stdio transport that connects Copilot to a PostgreSQL database for natural language queries."
track: "mcp"
difficulty: "intermediate"
featureRefs:
  - mcp-integration
personaTags:
  - developer
technologyTags:
  - mcp
  - nodejs
  - typescript
  - postgresql
prerequisites:
  - mcp-beginner
estimatedMinutes: 45
lastGenerated: 2026-04-08
published: true
---

# 🟡 Build a Custom stdio MCP Server

You've connected Copilot to the GitHub MCP server. Now it's time to **build your own**. In this course you'll create a custom MCP server that connects Copilot CLI to a PostgreSQL database — letting you query real data with natural language, right from the terminal.

## The Scenario

Your team maintains a product database with thousands of records. Instead of writing SQL by hand or navigating a dashboard, you want to ask Copilot:

```
What were our top 10 best-selling products last quarter?
```

And have it automatically translate that into a SQL query, execute it against your database, and return formatted results. That's what your MCP server will enable.

## Prerequisites

- Completed the [MCP Beginner course](/Learn-GHCP/courses/mcp/mcp-beginner/)
- Node.js 20+ and npm installed
- TypeScript basics (types, interfaces, async/await)
- A PostgreSQL instance (local or Docker — setup instructions below)
- Copilot CLI installed and working

### Quick PostgreSQL Setup with Docker

If you don't have PostgreSQL running, start one with sample data:

```bash
docker run -d \
  --name mcp-postgres \
  -e POSTGRES_PASSWORD=mcp_demo \
  -e POSTGRES_DB=products \
  -p 5432:5432 \
  postgres:16
```

Then seed it with test data:

```bash
docker exec -i mcp-postgres psql -U postgres -d products <<'SQL'
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  units_sold INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO products (name, category, price, units_sold) VALUES
  ('Mechanical Keyboard', 'Electronics', 89.99, 1520),
  ('Ergonomic Mouse', 'Electronics', 49.99, 2300),
  ('Standing Desk', 'Furniture', 599.00, 430),
  ('Monitor Arm', 'Accessories', 129.99, 890),
  ('USB-C Hub', 'Electronics', 39.99, 3100),
  ('Desk Lamp', 'Accessories', 34.99, 1750),
  ('Webcam HD', 'Electronics', 79.99, 1100),
  ('Laptop Stand', 'Accessories', 44.99, 2050),
  ('Noise-Cancelling Headphones', 'Electronics', 249.99, 670),
  ('Cable Management Kit', 'Accessories', 19.99, 4200);
SQL
```

## MCP Server Anatomy

Every MCP server implements two core JSON-RPC methods:

### `tools/list` — Advertise Capabilities

When a client connects, it calls `tools/list`. Your server responds with an array of tool definitions:

```json
{
  "tools": [
    {
      "name": "query_database",
      "description": "Execute a read-only SQL query and return results",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sql": { "type": "string", "description": "A SELECT query" }
        },
        "required": ["sql"]
      }
    }
  ]
}
```

The AI model reads these descriptions to decide **when** and **how** to call each tool.

### `tools/call` — Execute a Tool

When the AI decides to use a tool, the client sends a `tools/call` request:

```json
{
  "method": "tools/call",
  "params": {
    "name": "query_database",
    "arguments": { "sql": "SELECT name, units_sold FROM products ORDER BY units_sold DESC LIMIT 5" }
  }
}
```

Your server executes the query and returns results as **content blocks**:

```json
{
  "content": [
    {
      "type": "text",
      "text": "| name | units_sold |\n|------|------|\n| Cable Management Kit | 4200 |\n| USB-C Hub | 3100 | ..."
    }
  ]
}
```

## Step 1: Scaffold the Project

Create a new directory and initialize:

```bash
mkdir mcp-postgres-server && cd mcp-postgres-server
npm init -y
npm install @modelcontextprotocol/sdk pg
npm install -D typescript @types/node @types/pg tsx
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

## Step 2: Define Your Tools

Create `src/tools.ts` — this is where you declare what your server can do:

```typescript
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const TOOLS: Tool[] = [
  {
    name: "query_database",
    description:
      "Execute a read-only SQL SELECT query against the PostgreSQL database. " +
      "Returns results as a formatted markdown table. " +
      "Only SELECT statements are allowed — mutations are rejected.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "A valid SQL SELECT query. Must not contain INSERT, UPDATE, DELETE, DROP, or other mutation statements.",
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "list_tables",
    description:
      "List all user-defined tables in the connected PostgreSQL database " +
      "with their column counts and approximate row counts.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];
```

> 💡 **Tip:** Write tool descriptions as if you're explaining to a colleague. The AI uses these descriptions to decide which tool to call and how to format arguments.

## Step 3: Implement the Database Layer

Create `src/db.ts` to handle PostgreSQL connections:

```typescript
import pg from "pg";

const pool = new pg.Pool({
  host: process.env.PG_HOST ?? "localhost",
  port: parseInt(process.env.PG_PORT ?? "5432", 10),
  database: process.env.PG_DATABASE ?? "products",
  user: process.env.PG_USER ?? "postgres",
  password: process.env.PG_PASSWORD ?? "mcp_demo",
  max: 5,
  idleTimeoutMillis: 30_000,
});

// Validate that a query is read-only
function assertReadOnly(sql: string): void {
  const normalized = sql.trim().toUpperCase();
  const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE"];
  for (const keyword of forbidden) {
    if (normalized.startsWith(keyword)) {
      throw new Error(`Mutation queries are not allowed. Received: ${keyword}`);
    }
  }
}

export async function executeQuery(sql: string): Promise<Record<string, unknown>[]> {
  assertReadOnly(sql);
  const result = await pool.query(sql);
  return result.rows;
}

export async function listTables(): Promise<Record<string, unknown>[]> {
  const result = await pool.query(`
    SELECT
      t.table_name,
      (SELECT count(*) FROM information_schema.columns c
       WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count,
      s.n_live_tup AS approx_row_count
    FROM information_schema.tables t
    LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  `);
  return result.rows;
}

export async function shutdown(): Promise<void> {
  await pool.end();
}
```

### Why Read-Only?

Exposing a writable database to an AI is dangerous. The `assertReadOnly` guard ensures the AI can only **read** data — never modify it. This is a critical safety boundary.

## Step 4: Build the MCP Server

Create `src/index.ts` — the main entry point:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { executeQuery, listTables, shutdown } from "./db.js";

const server = new McpServer({
  name: "postgres-query",
  version: "1.0.0",
});

// Register the query_database tool
server.tool(
  "query_database",
  "Execute a read-only SQL SELECT query against the PostgreSQL database.",
  {
    sql: {
      type: "string",
      description: "A valid SQL SELECT query.",
    },
  },
  async ({ sql }) => {
    try {
      const rows = await executeQuery(sql);

      if (rows.length === 0) {
        return { content: [{ type: "text", text: "Query returned no results." }] };
      }

      // Format results as a markdown table
      const columns = Object.keys(rows[0]);
      const header = `| ${columns.join(" | ")} |`;
      const separator = `| ${columns.map(() => "---").join(" | ")} |`;
      const body = rows.map(
        (row) => `| ${columns.map((col) => String(row[col] ?? "NULL")).join(" | ")} |`
      );

      const table = [header, separator, ...body].join("\n");
      return {
        content: [{ type: "text", text: `**${rows.length} row(s) returned:**\n\n${table}` }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Query error: ${message}` }],
        isError: true,
      };
    }
  }
);

// Register the list_tables tool
server.tool(
  "list_tables",
  "List all user-defined tables in the connected PostgreSQL database.",
  {},
  async () => {
    try {
      const tables = await listTables();

      if (tables.length === 0) {
        return { content: [{ type: "text", text: "No user-defined tables found." }] };
      }

      const lines = tables.map(
        (t) => `- **${t.table_name}** — ${t.column_count} columns, ~${t.approx_row_count} rows`
      );

      return {
        content: [{ type: "text", text: `**Tables in database:**\n\n${lines.join("\n")}` }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error listing tables: ${message}` }],
        isError: true,
      };
    }
  }
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Postgres server running on stdio");
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

### Key Patterns

- **`server.tool()`** registers a tool with its name, description, parameter schema, and handler function.
- **`StdioServerTransport`** reads JSON-RPC messages from stdin and writes responses to stdout.
- **`console.error()`** is used for logging — stdout is reserved for MCP protocol messages.
- **Error handling** returns `isError: true` so the AI knows the call failed and can retry or inform the user.

## Step 5: Build and Test Manually

Compile and test the server directly:

```bash
npx tsc
```

Test by sending a raw JSON-RPC `initialize` request:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}' | node dist/index.js
```

You should see a JSON response with the server's capabilities.

## Step 6: Connect to Copilot CLI

Add your server to the MCP configuration:

**`~/.copilot/mcp-config.json`** (macOS/Linux) or **`%USERPROFILE%\.copilot\mcp-config.json`** (Windows):

```json
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-postgres-server/dist/index.js"],
      "env": {
        "PG_HOST": "localhost",
        "PG_PORT": "5432",
        "PG_DATABASE": "products",
        "PG_USER": "postgres",
        "PG_PASSWORD": "mcp_demo"
      }
    }
  }
}
```

> ⚠️ **Important:** Replace `/absolute/path/to/` with the actual path to your compiled server.

## Step 7: Test End-to-End

Start a new Copilot CLI session and try these prompts:

### List Available Tables
```
What tables are in my database?
```

Copilot calls `list_tables` and shows the result.

### Query Products
```
Show me the top 5 products by units sold
```

Copilot translates this to SQL, calls `query_database`, and formats the results.

### Complex Query
```
What's the total revenue by category? Calculate it as price × units_sold.
```

**Expected tool call:**
```json
{
  "name": "query_database",
  "arguments": {
    "sql": "SELECT category, SUM(price * units_sold) AS total_revenue FROM products GROUP BY category ORDER BY total_revenue DESC"
  }
}
```

### Error Handling
```
Delete all products from the database
```

The AI may attempt a DELETE, but your `assertReadOnly` guard blocks it and returns an error. The AI should report that mutation queries are not allowed.

## Understanding the Message Flow

Here's what happens when you type "Show me the top 5 products":

```
You ──▶ Copilot CLI ──▶ AI Model
                           │
                           │ (model decides to call query_database)
                           ▼
                     MCP Client ──── JSON-RPC over stdio ────▶ MCP Server
                                                                  │
                                                                  │ (executes SQL)
                                                                  ▼
                                                             PostgreSQL
                                                                  │
                                                                  │ (returns rows)
                                                                  ▼
                     MCP Client ◀─── JSON-RPC response ──── MCP Server
                           │
                           │ (formats result for display)
                           ▼
                        AI Model ──▶ Copilot CLI ──▶ You
```

The entire round-trip takes milliseconds. The AI model never touches the database directly — it only sees the query results your server returns.

## Extension Challenge: Add a `describe_table` Tool

Now extend your server with a third tool that describes a table's schema in detail.

### Requirements

The `describe_table` tool should:
- Accept a `table_name` parameter
- Return column names, data types, nullability, and default values
- Indicate which columns are primary keys
- Show foreign key relationships if any exist

### Starter Code

Add to `src/db.ts`:

```typescript
export async function describeTable(tableName: string): Promise<Record<string, unknown>[]> {
  // Validate table name to prevent injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error("Invalid table name");
  }

  const result = await pool.query(`
    SELECT
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
      WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
    ) pk ON pk.column_name = c.column_name
    WHERE c.table_name = $1 AND c.table_schema = 'public'
    ORDER BY c.ordinal_position
  `, [tableName]);

  return result.rows;
}
```

Register it in `src/index.ts`:

```typescript
server.tool(
  "describe_table",
  "Get the full schema of a database table including columns, types, and keys.",
  {
    table_name: {
      type: "string",
      description: "The name of the table to describe.",
    },
  },
  async ({ table_name }) => {
    try {
      const columns = await describeTable(table_name);

      if (columns.length === 0) {
        return {
          content: [{ type: "text", text: `Table '${table_name}' not found or has no columns.` }],
        };
      }

      const lines = columns.map((col) => {
        const pk = col.is_primary_key === "YES" ? " 🔑" : "";
        const nullable = col.is_nullable === "YES" ? "nullable" : "NOT NULL";
        const def = col.column_default ? `, default: ${col.column_default}` : "";
        return `- **${col.column_name}** \`${col.data_type}\` ${nullable}${def}${pk}`;
      });

      return {
        content: [{ type: "text", text: `**Schema for \`${table_name}\`:**\n\n${lines.join("\n")}` }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Error describing table: ${message}` }],
        isError: true,
      };
    }
  }
);
```

After implementing, test it:

```
Describe the schema of the products table
```

## 🎯 What You Learned

- How MCP servers expose tools via `tools/list` and `tools/call`
- How to build a TypeScript MCP server using `@modelcontextprotocol/sdk`
- How stdio transport works (stdin/stdout for JSON-RPC messages)
- How to implement safety guards (read-only queries, input validation)
- How to connect a custom server to Copilot CLI
- The full message flow from user prompt to database query and back

## ➡️ Next Steps

Ready to go production-grade? Continue to the advanced course:
- 🔴 [Production MCP Servers: HTTP, Auth, and Multi-Server Chaining](/Learn-GHCP/courses/mcp/mcp-advanced/)
