---
title: "Design a Custom CLI Plugin with MCP Integration"
description: "Architect and build a production-grade Copilot CLI plugin that connects to external tools via MCP servers."
track: "copilot-cli"
difficulty: "advanced"
featureRefs:
  - copilot-cli
  - cli-plugins
  - mcp-integration
personaTags:
  - developer
  - architect
technologyTags:
  - terminal
  - cli
  - nodejs
  - mcp
  - typescript
prerequisites:
  - copilot-cli-intermediate
estimatedMinutes: 60
lastGenerated: 2026-04-08
published: true
---

# 🔴 Design a Custom CLI Plugin with MCP Integration

In this advanced course, you'll design and build a production-grade Copilot CLI plugin that connects to a custom MCP server, enabling Copilot to interact with external databases and APIs.

## The Challenge

**Design a Copilot CLI plugin** that:
1. Connects to a PostgreSQL database via a custom MCP server
2. Allows natural language queries to be translated to SQL
3. Returns formatted results within the CLI session
4. Handles authentication, rate limiting, and error recovery

This is an open-ended challenge. The sections below provide architectural guidance, but the implementation decisions are yours.

## Architecture Decisions

### Plugin vs. Extension vs. MCP Server

Before writing code, consider the trade-offs:

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **CLI Plugin** | Deep CLI integration, access to session state | Coupled to CLI version | CLI-specific features |
| **MCP Server** | Universal, works with any MCP client | More infrastructure | Shared tool access |
| **Plugin + MCP** | Best of both worlds | More complex | Production systems |

For this project, we'll build **both**: a plugin that orchestrates the UX and an MCP server that handles the database connection.

## Design: MCP Server

Your MCP server should implement the `tools/list` and `tools/call` methods:

```typescript
// mcp-server/src/tools.ts
export const tools = [
  {
    name: "query_database",
    description: "Execute a read-only SQL query against the connected database",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "SQL SELECT query" },
        params: { type: "array", items: { type: "string" } }
      },
      required: ["query"]
    }
  },
  {
    name: "describe_table",
    description: "Get the schema of a database table",
    inputSchema: {
      type: "object",
      properties: {
        tableName: { type: "string" }
      },
      required: ["tableName"]
    }
  }
];
```

## Production Considerations

- **Connection pooling**: Use `pg-pool` with configurable pool sizes
- **Query sanitization**: Parameterized queries only, no string interpolation
- **Rate limiting**: Token bucket algorithm, configurable per-user limits
- **Error recovery**: Exponential backoff on connection failures, circuit breaker pattern
- **Observability**: Structured JSON logging, health check endpoint

## Capstone Project

Build the complete system:
1. MCP server with PostgreSQL connectivity
2. CLI plugin with natural language to SQL translation
3. Automated tests (unit + integration)
4. Documentation and configuration management
5. Docker Compose setup for local development

**Deliverable:** A working GitHub repository with README, tests, and deployment instructions.
