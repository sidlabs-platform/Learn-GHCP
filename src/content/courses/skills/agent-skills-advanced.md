---
title: "Build Multi-Step Skills with MCP Integration"
description: "Design advanced skills that chain multiple capabilities, integrate with MCP servers, and publish to the Skills Marketplace."
track: "skills"
difficulty: "advanced"
featureRefs:
  - copilot-skills
  - mcp-integration
personaTags:
  - developer
  - architect
technologyTags:
  - github
  - copilot
  - mcp
  - typescript
prerequisites:
  - agent-skills-intermediate
estimatedMinutes: 60
lastGenerated: 2026-04-08
published: true
---

# 🔴 Build Multi-Step Skills with MCP Integration

In this advanced course you'll design skills that chain capabilities together, connect to external data through MCP servers, and publish your work to the Skills Marketplace.

## Prerequisites

- Completed [Create a Custom SKILL.md from Scratch](/Learn-GHCP/courses/skills/agent-skills-intermediate/)
- Familiarity with TypeScript and Node.js
- Understanding of REST APIs and database concepts
- A GitHub account with Copilot and MCP access

## The Challenge

Your team needs a skill that does more than enforce patterns — it needs to **query a live database** for schema information, **generate type-safe code** matching that schema, and **validate the output** against your team's standards. This requires chaining a Copilot skill with an MCP server that provides real-time data access.

By the end of this course, you'll build exactly that.

## Architecture: Skill Composition Patterns

Advanced skills combine multiple layers. Here are the key patterns:

### Pattern 1 — Layered Skills

Stack complementary skills where each handles a different concern:

```
┌─────────────────────────────────┐
│  Skill: API Patterns            │  ← Response format, auth, validation
├─────────────────────────────────┤
│  Skill: DB Query Patterns       │  ← Query safety, transactions, pooling
├─────────────────────────────────┤
│  MCP Server: Schema Provider    │  ← Live schema, column types, relations
└─────────────────────────────────┘
```

Each layer contributes context independently. Copilot merges all active skill instructions when generating code.

### Pattern 2 — Orchestrated Workflow

A single skill defines a multi-step workflow where each step builds on the previous:

```
Step 1: Query MCP server for table schema
         ↓
Step 2: Generate TypeScript interfaces from schema
         ↓
Step 3: Create CRUD endpoints following API patterns
         ↓
Step 4: Add validation schemas matching DB constraints
```

### Pattern 3 — Conditional Branching

The skill's instructions include decision logic:

```
IF the target table has soft-delete (deleted_at column)
  → Include soft-delete in all queries
  → Add restore endpoint
ELSE
  → Use hard delete with cascade rules
```

| Pattern | Best For | Complexity |
|---------|----------|------------|
| Layered | Teams with distinct domain experts owning each layer | Low |
| Orchestrated | End-to-end code generation workflows | Medium |
| Conditional | Adapting to varying project structures | High |

## Building a Multi-Step Skill with Context Passing

Let's build a skill that generates a complete API module from a database table name.

### Step 1 — Define the workflow in SKILL.md

Create a new repository `copilot-skill-api-generator` with this `SKILL.md`:

```markdown
---
name: "Full-Stack API Generator"
description: "Generates complete API modules from database table schemas, including types, validation, routes, and tests."
---

# Full-Stack API Generator

Generate a complete, production-ready API module for a database table.

## Instructions

When asked to generate an API for a table, follow these steps IN ORDER:

### Step 1 — Retrieve Schema
Use the MCP database tool to fetch the table's column definitions,
constraints, and relationships. Store this context for subsequent steps.

### Step 2 — Generate TypeScript Interfaces
From the schema, create:
- A base entity interface matching all columns
- A `Create` DTO excluding auto-generated fields (id, timestamps)
- An `Update` DTO making all `Create` fields optional
- A `Filters` interface for query parameters

\`\`\`typescript
// Example output for a "products" table
interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateProductDto {
  name: string;
  price: number;
  categoryId: string;
}

interface UpdateProductDto {
  name?: string;
  price?: number;
  categoryId?: string;
}

interface ProductFilters {
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}
\`\`\`

### Step 3 — Generate Zod Validation Schemas
Create Zod schemas that mirror DB constraints:
- String columns with max length → `z.string().max(n)`
- Non-nullable columns → required fields
- Foreign keys → `z.string().uuid()`
- Numeric columns with CHECK constraints → `.min()` / `.max()`

\`\`\`typescript
import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive().max(999999.99),
  categoryId: z.string().uuid(),
});

export const updateProductSchema = createProductSchema.partial();

export const productFiltersSchema = z.object({
  name: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  categoryId: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});
\`\`\`

### Step 4 — Generate Route Handlers
Create Express route handlers for all CRUD operations:
- `GET /` with filtering and pagination
- `GET /:id` with 404 handling
- `POST /` with creation and 201 response
- `PUT /:id` with update and 404 handling
- `DELETE /:id` with soft-delete if applicable

All routes MUST use the ApiResponse envelope, authenticate middleware,
and validate middleware with the generated Zod schemas.

### Step 5 — Generate Tests
Create test stubs covering:
- Happy path for each CRUD operation
- Validation rejection for invalid inputs
- 404 handling for missing resources
- Authentication and authorization checks

## Constraints
- Generate one module per table — do not combine multiple tables
- Foreign key relationships should reference the related module, not inline the logic
- All generated code must be TypeScript with strict mode enabled
```

### Step 2 — Connect to an MCP server

The skill references MCP tools for live schema access. Configure your MCP server in `.vscode/mcp.json`:

```json
{
  "servers": {
    "db-schema": {
      "command": "npx",
      "args": ["-y", "@example/mcp-postgres-schema"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/mydb"
      }
    }
  }
}
```

This MCP server exposes tools like:

| MCP Tool | Purpose |
|----------|---------|
| `get_table_schema` | Returns columns, types, constraints for a table |
| `get_table_relations` | Returns foreign key relationships |
| `list_tables` | Lists all tables in the database |

### Step 3 — Build the MCP server

If no existing MCP server fits your needs, build one. Create a new project:

```bash
mkdir mcp-postgres-schema && cd mcp-postgres-schema
npm init -y
npm install @modelcontextprotocol/sdk pg
npm install -D typescript @types/node @types/pg
```

Implement the server in `src/index.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const server = new McpServer({
  name: "postgres-schema",
  version: "1.0.0",
});

server.tool(
  "get_table_schema",
  "Get column definitions and constraints for a database table",
  { tableName: z.string().describe("Name of the database table") },
  async ({ tableName }) => {
    const result = await pool.query(
      `SELECT column_name, data_type, is_nullable,
              column_default, character_maximum_length
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );

    const constraints = await pool.query(
      `SELECT tc.constraint_type, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = $1`,
      [tableName]
    );

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { columns: result.rows, constraints: constraints.rows },
            null,
            2
          ),
        },
      ],
    };
  }
);

server.tool(
  "get_table_relations",
  "Get foreign key relationships for a database table",
  { tableName: z.string().describe("Name of the database table") },
  async ({ tableName }) => {
    const result = await pool.query(
      `SELECT kcu.column_name, ccu.table_name AS foreign_table,
              ccu.column_name AS foreign_column
       FROM information_schema.key_column_usage kcu
       JOIN information_schema.constraint_column_usage ccu
         ON kcu.constraint_name = ccu.constraint_name
       JOIN information_schema.table_constraints tc
         ON kcu.constraint_name = tc.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND kcu.table_name = $1`,
      [tableName]
    );

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.rows, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

Build and test:

```bash
npx tsc
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```

## Publishing to the Skills Marketplace

Once your skill is tested and stable, publish it for others to discover.

### Step 1 — Prepare the repository

Ensure your repository includes:

```
copilot-skill-api-generator/
├── SKILL.md              # The skill definition (required)
├── README.md             # Usage docs, installation instructions
├── LICENSE               # Open source license
├── CHANGELOG.md          # Version history
└── examples/             # Sample outputs for reference
    ├── products-module/
    └── users-module/
```

### Step 2 — Add discoverability metadata

Tag your repository with relevant topics:

```bash
# Via GitHub CLI
gh repo edit --add-topic copilot-skill,api,typescript,code-generation
```

### Step 3 — Submit to the marketplace

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Copilot** → **Publish as Skill**
3. Fill in the listing details: description, category, screenshots
4. Submit for review

> 💡 **Tip:** Include a GIF or screenshot showing the skill in action — it significantly increases adoption.

## Production Considerations

### Versioning

Use semantic versioning for your `SKILL.md` changes:

| Change Type | Version Bump | Example |
|-------------|-------------|---------|
| Fix typo in instructions | Patch (1.0.1) | Clarify wording |
| Add new section or examples | Minor (1.1.0) | Add soft-delete pattern |
| Restructure core instructions | Major (2.0.0) | Change response format |

Track versions in your `CHANGELOG.md`:

```markdown
## [1.1.0] - 2026-04-08
### Added
- Soft-delete detection and conditional endpoint generation
- Test generation for authorization checks

### Changed
- Improved Zod schema generation for numeric constraints
```

### Testing

Create a test suite for your skill by maintaining a set of reference prompts and expected outputs:

```typescript
// skill-tests/api-generator.test.ts
const testCases = [
  {
    prompt: "Generate an API module for the 'orders' table",
    expectedPatterns: [
      /interface Order\s*\{/,
      /createOrderSchema/,
      /router\.(get|post|put|delete)/,
      /authenticate/,
      /ApiResponse</,
    ],
  },
  {
    prompt: "Generate an API for 'users' with soft-delete",
    expectedPatterns: [
      /deletedAt/,
      /restore/,
      /WHERE.*deleted_at.*IS NULL/,
    ],
  },
];
```

### Documentation

Maintain these docs alongside your skill:

- **README.md** — Installation, usage, and configuration
- **CONTRIBUTING.md** — How team members can propose changes to the skill
- **CHANGELOG.md** — Version history for tracking what changed
- **examples/** — Reference outputs so developers know what to expect

## 🏗️ Capstone: Full-Stack Database Skill

Build the complete system end-to-end:

1. **Create the MCP server** (`mcp-postgres-schema`) that exposes your database's table schemas, relationships, and constraints as MCP tools.

2. **Create the skill** (`copilot-skill-api-generator`) with a `SKILL.md` that orchestrates the multi-step workflow: fetch schema → generate types → generate validation → generate routes → generate tests.

3. **Configure the integration** by adding the MCP server to your `.vscode/mcp.json` and installing the skill.

4. **Test the full flow** with this prompt:

   ```
   Generate a complete API module for the "orders" table,
   including types, validation, routes, and tests.
   ```

5. **Validate the output:**
   - ✅ Types match actual database columns
   - ✅ Zod schemas reflect real DB constraints (max length, NOT NULL)
   - ✅ Foreign keys reference correct related modules
   - ✅ Routes follow the API response envelope pattern
   - ✅ Tests cover all CRUD operations and edge cases

6. **Publish** the skill to your organization and gather feedback.

> 💡 **Stretch goal:** Add a second MCP server for your API documentation platform (e.g., Swagger/OpenAPI). The skill can then auto-generate OpenAPI specs alongside the code.

## 🎯 What You Learned

- Skill composition patterns: layered, orchestrated, and conditional branching
- How to build multi-step skills that chain capabilities with context passing
- Building and connecting MCP servers for live external data access
- Publishing skills to the marketplace with proper metadata
- Production practices: versioning, testing, and documentation for maintainable skills

## ➡️ Next Steps

You've completed the Copilot Agent Skills track! From here you can:

- **Explore the MCP track** to deepen your MCP server development skills
- **Contribute to community skills** by publishing your creations
- **Build organization-wide skill libraries** that standardize your entire team's output
- **Combine skills with Copilot agents** for fully automated development workflows
