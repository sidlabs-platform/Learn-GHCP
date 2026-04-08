---
title: "Production MCP Servers: HTTP, Auth, and Multi-Server Chaining"
description: "Build remote HTTP/SSE MCP servers with authentication, rate limiting, and chain multiple servers for complex workflows."
track: "mcp"
difficulty: "advanced"
featureRefs:
  - mcp-integration
  - copilot-cli
personaTags:
  - developer
  - architect
technologyTags:
  - mcp
  - nodejs
  - typescript
  - docker
  - authentication
prerequisites:
  - mcp-intermediate
estimatedMinutes: 75
lastGenerated: 2026-04-08
published: true
---

# 🔴 Production MCP Servers: HTTP, Auth, and Multi-Server Chaining

You've built a local stdio MCP server. Now it's time to go production-grade: remote HTTP transport, OAuth2 authentication, rate limiting, multi-server chaining, Docker deployment, and observability. This is an **open-ended challenge** — the sections below provide architecture, patterns, and starter code, but the design decisions are yours.

## The Challenge

Design and build a **production MCP infrastructure** that includes:

1. A remote MCP server using HTTP+SSE transport with OAuth2 authentication
2. Rate limiting and abuse prevention
3. Multiple chained MCP servers working together
4. Docker-based deployment
5. Monitoring and observability

## Prerequisites

- Completed the [MCP Intermediate course](/Learn-GHCP/courses/mcp/mcp-intermediate/)
- Strong TypeScript / Node.js skills
- Familiarity with Express.js or similar HTTP frameworks
- Docker and Docker Compose basics
- Understanding of OAuth2 concepts (tokens, scopes, flows)

## Part 1: HTTP+SSE Transport

### Why Move Beyond stdio?

stdio transport is great for local tools, but it has limitations:

| Aspect | stdio | HTTP+SSE |
|--------|-------|----------|
| **Deployment** | Must run on same machine | Run anywhere (cloud, container, remote host) |
| **Scaling** | Single process | Horizontal scaling behind load balancer |
| **Sharing** | One user per process | Multi-tenant, team-wide access |
| **Security** | Inherits OS-level access | Fine-grained auth, TLS, network policies |
| **Lifecycle** | Tied to host process | Independent lifecycle, zero-downtime deploys |

### How HTTP+SSE Works

MCP over HTTP uses **Server-Sent Events (SSE)** for the server-to-client channel and regular HTTP POST for client-to-server messages:

```
Client                                 Server
  │                                       │
  │─── GET /sse ─────────────────────────▶│  (opens SSE stream)
  │◀── SSE: endpoint=/messages?sid=abc ───│  (server sends message endpoint)
  │                                       │
  │─── POST /messages?sid=abc ───────────▶│  (client sends JSON-RPC)
  │◀── SSE: {"result": ...} ─────────────│  (server streams response)
  │                                       │
```

### Implementation: HTTP+SSE Server

Start with the MCP SDK's built-in SSE transport:

```typescript
// src/server.ts
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3100", 10);

// Track active transports for cleanup
const transports = new Map<string, SSEServerTransport>();

// Create a fresh MCP server instance per connection
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "production-mcp",
    version: "1.0.0",
  });

  // Register your tools here (same as stdio version)
  server.tool(
    "query_database",
    "Execute a read-only SQL SELECT query.",
    { sql: { type: "string", description: "SQL SELECT query" } },
    async ({ sql }) => {
      // ... your implementation
      return { content: [{ type: "text", text: "results here" }] };
    }
  );

  return server;
}

// SSE endpoint — client opens a long-lived connection
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  const server = createMcpServer();
  await server.connect(transport);

  // Cleanup on disconnect
  req.on("close", () => {
    transports.delete(sessionId);
  });
});

// Message endpoint — client sends JSON-RPC requests
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
  console.log(`MCP server listening on http://localhost:${PORT}`);
});
```

Install the additional dependency:

```bash
npm install express
npm install -D @types/express
```

## Part 2: OAuth2 Authentication

A production server must verify that callers are authorized. MCP supports OAuth2 for HTTP transport.

### Authentication Architecture

```
Client                  Auth Server              MCP Server
  │                         │                        │
  │── GET /authorize ──────▶│                        │
  │◀── redirect + code ────│                        │
  │── POST /token ─────────▶│                        │
  │◀── access_token ───────│                        │
  │                         │                        │
  │── GET /sse ────────────────────────────────────▶│
  │   Authorization: Bearer <token>                  │
  │◀── SSE stream ─────────────────────────────────│
```

### Implementation: Auth Middleware

Create `src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface TokenPayload {
  sub: string;
  scopes: string[];
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

export function requireAuth(requiredScopes: string[] = []) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "unauthorized",
        message: "Missing or invalid Authorization header",
      });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

      // Verify required scopes
      const hasScopes = requiredScopes.every((scope) =>
        payload.scopes.includes(scope)
      );

      if (!hasScopes) {
        res.status(403).json({
          error: "forbidden",
          message: `Missing required scopes: ${requiredScopes.join(", ")}`,
        });
        return;
      }

      // Attach user info to request for downstream use
      (req as any).user = { id: payload.sub, scopes: payload.scopes };
      next();
    } catch {
      res.status(401).json({
        error: "unauthorized",
        message: "Invalid or expired token",
      });
    }
  };
}
```

Apply the middleware to your SSE and message endpoints:

```typescript
app.get("/sse", requireAuth(["mcp:read"]), async (req, res) => {
  // ... SSE handler
});

app.post("/messages", requireAuth(["mcp:read"]), async (req, res) => {
  // ... message handler
});
```

### Token Generation (Development Helper)

For local testing, add a token endpoint:

```typescript
// src/routes/token.ts (development only!)
import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";

router.post("/dev/token", (req, res) => {
  const { userId = "dev-user", scopes = ["mcp:read"] } = req.body ?? {};

  const token = jwt.sign(
    { sub: userId, scopes },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({ access_token: token, token_type: "Bearer", expires_in: 28800 });
});

export default router;
```

> ⚠️ **Never expose a dev token endpoint in production.** Use a real OAuth2 provider (GitHub, Auth0, Azure AD) for production deployments.

## Part 3: Rate Limiting

Protect your server from abuse with a token bucket rate limiter:

```typescript
// src/middleware/rate-limit.ts
interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketRateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private maxTokens: number = 60,
    private refillRate: number = 1, // tokens per second
    private refillInterval: number = 1000
  ) {}

  consume(key: string, tokens: number = 1): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const refillTokens = Math.floor(elapsed / this.refillInterval) * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refillTokens);
    bucket.lastRefill = now;

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return { allowed: true, retryAfterMs: 0 };
    }

    const deficit = tokens - bucket.tokens;
    const retryAfterMs = Math.ceil((deficit / this.refillRate) * this.refillInterval);
    return { allowed: false, retryAfterMs };
  }

  // Periodic cleanup of expired buckets
  cleanup(maxAgeMs: number = 300_000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, bucket] of this.buckets) {
      if (bucket.lastRefill < cutoff) {
        this.buckets.delete(key);
      }
    }
  }
}
```

Apply as Express middleware:

```typescript
// src/middleware/rate-limit-middleware.ts
import { Request, Response, NextFunction } from "express";
import { TokenBucketRateLimiter } from "./rate-limit.js";

const limiter = new TokenBucketRateLimiter(60, 1); // 60 requests/minute

// Periodic cleanup every 5 minutes
setInterval(() => limiter.cleanup(), 300_000);

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userId = (req as any).user?.id ?? req.ip ?? "anonymous";
  const { allowed, retryAfterMs } = limiter.consume(userId);

  if (!allowed) {
    res.status(429).json({
      error: "rate_limited",
      message: "Too many requests",
      retry_after_ms: retryAfterMs,
    });
    return;
  }

  next();
}
```

## Part 4: Multi-Server Chaining

The real power of MCP emerges when you **chain multiple servers** together. Each server specializes in one domain, and the AI orchestrates calls across all of them.

### Architecture: Multi-Server System

```
                    ┌─────────────────┐
                    │   Copilot CLI    │
                    │   (MCP Host)     │
                    └─────┬───────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
           ▼              ▼              ▼
    ┌─────────────┐ ┌──────────┐ ┌──────────────┐
    │  DB Server  │ │ API Server│ │ File Server  │
    │  (postgres) │ │ (REST)   │ │ (local fs)   │
    └──────┬──────┘ └─────┬────┘ └──────┬───────┘
           │              │              │
           ▼              ▼              ▼
      PostgreSQL    External APIs   File System
```

The host (Copilot CLI) connects to all three servers simultaneously. When you ask a question that spans domains, the AI calls tools from multiple servers in sequence.

### Configuration: Multiple Servers

```json
{
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["./servers/db-server/dist/index.js"],
      "env": { "PG_DATABASE": "products" }
    },
    "api": {
      "type": "sse",
      "url": "https://api-mcp.yourcompany.com/sse",
      "headers": {
        "Authorization": "Bearer ${MCP_API_TOKEN}"
      }
    },
    "filesystem": {
      "command": "node",
      "args": ["./servers/fs-server/dist/index.js"],
      "env": { "ALLOWED_PATHS": "/data/reports,/data/exports" }
    }
  }
}
```

### Cross-Server Workflow Example

A single user prompt can trigger tools from multiple servers:

**Prompt:** "Generate a sales report for Q1, save it as CSV, and compare it against last year's API forecast."

```
Step 1: AI calls database.query_database
        → SELECT category, SUM(revenue) FROM sales WHERE quarter = 'Q1' GROUP BY category

Step 2: AI calls api.get_forecast
        → GET /api/forecasts?year=2025&quarter=Q1

Step 3: AI compares results and generates report text

Step 4: AI calls filesystem.write_file
        → Saves the comparison as /data/reports/q1-comparison.csv
```

The AI handles all the orchestration. You just define the tools on each server.

### Building a File System Server

Here's a minimal file system MCP server for the chain:

```typescript
// servers/fs-server/src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFile, writeFile, readdir } from "fs/promises";
import path from "path";

const ALLOWED_ROOTS = (process.env.ALLOWED_PATHS ?? "").split(",").filter(Boolean);

function validatePath(filePath: string): string {
  const resolved = path.resolve(filePath);
  const isAllowed = ALLOWED_ROOTS.some((root) => resolved.startsWith(path.resolve(root)));
  if (!isAllowed) {
    throw new Error(`Access denied: ${filePath} is outside allowed directories`);
  }
  return resolved;
}

const server = new McpServer({ name: "filesystem", version: "1.0.0" });

server.tool(
  "read_file",
  "Read the contents of a file.",
  { path: { type: "string", description: "File path to read" } },
  async ({ path: filePath }) => {
    try {
      const safePath = validatePath(filePath);
      const content = await readFile(safePath, "utf-8");
      return { content: [{ type: "text", text: content }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "write_file",
  "Write content to a file (creates or overwrites).",
  {
    path: { type: "string", description: "File path to write" },
    content: { type: "string", description: "Content to write" },
  },
  async ({ path: filePath, content }) => {
    try {
      const safePath = validatePath(filePath);
      await writeFile(safePath, content, "utf-8");
      return { content: [{ type: "text", text: `File written: ${safePath}` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "list_directory",
  "List files in a directory.",
  { path: { type: "string", description: "Directory path" } },
  async ({ path: dirPath }) => {
    try {
      const safePath = validatePath(dirPath);
      const entries = await readdir(safePath, { withFileTypes: true });
      const lines = entries.map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`);
      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("File system MCP server running");
}

main().catch(console.error);
```

> 🔒 **Security:** The `validatePath` function ensures the AI can only access files within explicitly allowed directories. This is essential — never give an AI unrestricted file system access.

## Part 5: Docker Deployment

Package your MCP infrastructure for reproducible deployment.

### Dockerfile for the HTTP Server

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:3100/health || exit 1
USER node
CMD ["node", "dist/server.js"]
```

Add a health check endpoint to your server:

```typescript
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});
```

### Docker Compose: Full Stack

```yaml
# docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: products
      POSTGRES_PASSWORD: ${PG_PASSWORD:-mcp_demo}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  mcp-server:
    build: .
    ports:
      - "3100:3100"
    environment:
      PG_HOST: postgres
      PG_DATABASE: products
      PG_USER: postgres
      PG_PASSWORD: ${PG_PASSWORD:-mcp_demo}
      JWT_SECRET: ${JWT_SECRET}
      PORT: "3100"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
```

Deploy:

```bash
# Start the full stack
docker compose up -d

# Verify
curl http://localhost:3100/health
```

## Part 6: Monitoring and Observability

Production servers need structured logging and metrics.

### Structured Logging

```typescript
// src/lib/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  // Write to stderr — stdout is reserved for MCP protocol
  process.stderr.write(JSON.stringify(entry) + "\n");
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
};
```

### Tool Call Metrics

Track tool usage for observability:

```typescript
// src/lib/metrics.ts
interface ToolMetric {
  callCount: number;
  errorCount: number;
  totalDurationMs: number;
}

const metrics = new Map<string, ToolMetric>();

export function recordToolCall(toolName: string, durationMs: number, isError: boolean): void {
  const metric = metrics.get(toolName) ?? { callCount: 0, errorCount: 0, totalDurationMs: 0 };
  metric.callCount++;
  metric.totalDurationMs += durationMs;
  if (isError) metric.errorCount++;
  metrics.set(toolName, metric);
}

export function getMetrics(): Record<string, ToolMetric & { avgDurationMs: number }> {
  const result: Record<string, ToolMetric & { avgDurationMs: number }> = {};
  for (const [name, metric] of metrics) {
    result[name] = {
      ...metric,
      avgDurationMs: metric.callCount > 0 ? metric.totalDurationMs / metric.callCount : 0,
    };
  }
  return result;
}
```

Expose metrics via endpoint:

```typescript
app.get("/metrics", requireAuth(["mcp:admin"]), (_req, res) => {
  res.json(getMetrics());
});
```

### Wrapping Tool Handlers with Instrumentation

```typescript
import { logger } from "./lib/logger.js";
import { recordToolCall } from "./lib/metrics.js";

server.tool(
  "query_database",
  "Execute a read-only SQL SELECT query.",
  { sql: { type: "string", description: "SQL SELECT query" } },
  async ({ sql }) => {
    const start = Date.now();
    logger.info("tool_call", { tool: "query_database", sql });

    try {
      const rows = await executeQuery(sql);
      const duration = Date.now() - start;
      recordToolCall("query_database", duration, false);
      logger.info("tool_success", { tool: "query_database", rows: rows.length, durationMs: duration });

      // ... format and return results
      return { content: [{ type: "text", text: `${rows.length} rows returned` }] };
    } catch (error) {
      const duration = Date.now() - start;
      recordToolCall("query_database", duration, true);
      logger.error("tool_error", { tool: "query_database", error: (error as Error).message, durationMs: duration });

      return {
        content: [{ type: "text", text: `Error: ${(error as Error).message}` }],
        isError: true,
      };
    }
  }
);
```

## Capstone: Multi-Server System

Build a complete multi-server MCP system with these three servers:

### Server 1: Database Server
- PostgreSQL connectivity with connection pooling
- Tools: `query_database`, `list_tables`, `describe_table`
- Read-only enforcement, parameterized queries

### Server 2: API Gateway Server
- Proxies calls to external REST APIs
- Tools: `api_get`, `api_post` (with allowlisted endpoints)
- Response caching with configurable TTL
- Circuit breaker for failing upstream services:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold: number = 5,
    private resetTimeoutMs: number = 30_000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > this.resetTimeoutMs) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open — upstream service unavailable");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }
}
```

### Server 3: File System Server
- Sandboxed read/write to allowed directories
- Tools: `read_file`, `write_file`, `list_directory`
- Path validation and access control

### Wiring It Together

Your `mcp-config.json` connects all three:

```json
{
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["./servers/db/dist/index.js"],
      "env": {
        "PG_HOST": "localhost",
        "PG_DATABASE": "products",
        "PG_USER": "postgres",
        "PG_PASSWORD": "mcp_demo"
      }
    },
    "api": {
      "type": "sse",
      "url": "http://localhost:3100/sse",
      "headers": {
        "Authorization": "Bearer ${MCP_API_TOKEN}"
      }
    },
    "filesystem": {
      "command": "node",
      "args": ["./servers/fs/dist/index.js"],
      "env": {
        "ALLOWED_PATHS": "/data/reports,/data/exports"
      }
    }
  }
}
```

### Test the Full System

Open Copilot CLI and try prompts that span all three servers:

```
Query the products table for Q1 revenue by category,
fetch the forecast from our API,
and save a comparison report to /data/reports/q1-review.csv
```

The AI should:
1. Call `database.query_database` for the sales data
2. Call `api.api_get` for the forecast
3. Synthesize a comparison
4. Call `filesystem.write_file` to save the report

## Design Considerations Checklist

Before shipping to production, review:

- [ ] **Authentication** — All endpoints require valid tokens with appropriate scopes
- [ ] **Authorization** — Tools enforce per-user permissions (e.g., admin vs. read-only)
- [ ] **Rate limiting** — Token bucket per user, with configurable limits
- [ ] **Input validation** — All tool inputs are validated and sanitized
- [ ] **Error handling** — Errors return structured messages with `isError: true`
- [ ] **Logging** — Structured JSON logs with request correlation IDs
- [ ] **Metrics** — Tool call counts, latencies, and error rates tracked
- [ ] **Health checks** — `/health` endpoint for load balancer probes
- [ ] **Graceful shutdown** — SIGTERM handler drains connections before exiting
- [ ] **TLS** — HTTPS in production (terminate at load balancer or in-process)
- [ ] **Secrets management** — No hardcoded credentials; use environment variables or a vault

## 🎯 What You Learned

- How HTTP+SSE transport works and when to choose it over stdio
- How to implement OAuth2 authentication for MCP servers
- How to build a token bucket rate limiter
- Multi-server chaining architecture and cross-server workflows
- Docker packaging and deployment for MCP infrastructure
- Structured logging, metrics, and observability patterns
- Production security checklist for MCP servers

## 📚 Further Reading

- [MCP Specification](https://modelcontextprotocol.io/specification) — The full protocol spec
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — Official SDK source and examples
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers) — Community-maintained server catalog
