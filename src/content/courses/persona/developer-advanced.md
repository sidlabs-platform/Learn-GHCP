---
title: "Copilot Power User: Custom Tools and Automation"
description: "Build custom Copilot extensions, automate repetitive workflows, and architect AI-augmented development pipelines."
track: "persona"
difficulty: "advanced"
featureRefs:
  - copilot-cli
  - cli-plugins
  - copilot-skills
  - mcp-integration
personaTags:
  - developer
  - architect
technologyTags:
  - vscode
  - typescript
  - cli
  - mcp
prerequisites:
  - developer-intermediate
estimatedMinutes: 60
lastGenerated: 2026-04-08
published: true
---

# 🔴 Copilot Power User: Custom Tools and Automation

In this advanced course you'll go beyond using Copilot to *extending* it. You'll build custom tools, create team-specific skills, integrate external data sources through MCP, and architect complete AI-augmented development pipelines.

## Prerequisites

- Completed [Copilot-Driven Development: Real-World Workflows](/Learn-GHCP/courses/persona/developer-intermediate/)
- Strong TypeScript skills
- Familiarity with the Copilot CLI
- Basic understanding of HTTP servers and JSON-RPC

## Step 1: Building a Custom Copilot Extension

Copilot extensions let you add domain-specific capabilities. Let's build one that integrates your team's internal API documentation.

### Scaffold the extension

```bash
mkdir copilot-api-docs-extension && cd copilot-api-docs-extension
npm init -y
npm install @anthropic-ai/sdk express zod
npm install -D typescript @types/node @types/express tsx
npx tsc --init --target ES2022 --module NodeNext --moduleResolution NodeNext
```

### Create the extension handler

Create `src/extension.ts`:

```typescript
import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

// Schema for incoming Copilot extension requests
const CopilotRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
});

// In-memory API documentation store
const apiDocs: Record<string, { method: string; path: string; description: string; example: string }> = {
  "list-users": {
    method: "GET",
    path: "/api/v2/users",
    description: "List all users with pagination support",
    example: `curl -H "Authorization: Bearer $TOKEN" https://api.example.com/api/v2/users?page=1&limit=20`,
  },
  "create-user": {
    method: "POST",
    path: "/api/v2/users",
    description: "Create a new user account",
    example: `curl -X POST -H "Content-Type: application/json" -d '{"name":"Alice","email":"alice@example.com"}' https://api.example.com/api/v2/users`,
  },
};

app.post("/", async (req, res) => {
  const parsed = CopilotRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const lastMessage = parsed.data.messages.at(-1);
  if (!lastMessage || lastMessage.role !== "user") {
    return res.status(400).json({ error: "No user message found" });
  }

  const query = lastMessage.content.toLowerCase();
  const matchingDocs = Object.entries(apiDocs).filter(
    ([key, doc]) =>
      key.includes(query) ||
      doc.description.toLowerCase().includes(query) ||
      doc.path.includes(query)
  );

  let responseContent: string;
  if (matchingDocs.length > 0) {
    responseContent = matchingDocs
      .map(([key, doc]) =>
        `### ${key}\n- **${doc.method}** \`${doc.path}\`\n- ${doc.description}\n\`\`\`bash\n${doc.example}\n\`\`\``
      )
      .join("\n\n");
  } else {
    responseContent = `No API documentation found for "${lastMessage.content}". Available endpoints: ${Object.keys(apiDocs).join(", ")}`;
  }

  res.json({
    messages: [{ role: "assistant", content: responseContent }],
  });
});

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => console.log(`Extension running on port ${PORT}`));
```

### Register with GitHub

1. Go to **GitHub Settings → Developer Settings → Copilot Extensions**
2. Create a new extension with your server URL
3. Set permissions and enable for your organization

> 💡 **Tip:** Use a tool like `ngrok` during development to expose your local server.

## Step 2: Creating Team-Specific Skills

Skills are reusable Copilot capabilities scoped to your organization. Define them to encode team conventions.

### Define a skill manifest

Create `.github/copilot-skills.yml`:

```yaml
skills:
  - name: "code-review-standards"
    description: "Enforce team code review standards and conventions"
    instructions: |
      When reviewing code, check for:
      1. All public functions must have JSDoc with @param and @returns
      2. Error handling must use our custom AppError class from src/errors/
      3. Database queries must use parameterized statements, never string concatenation
      4. API responses must follow our envelope format: { data, meta, errors }
      5. All new endpoints must have integration tests in __tests__/integration/

  - name: "db-migration-helper"
    description: "Generate database migrations following team conventions"
    instructions: |
      When generating migrations:
      1. Use our migration format: YYYYMMDD_HHMMSS_description.sql
      2. Always include both UP and DOWN sections
      3. Add comments explaining why the migration is needed
      4. For column additions, always provide a DEFAULT value
      5. Never drop columns — mark them as deprecated with a comment
    files:
      - "src/db/migrations/*.sql"
      - "src/db/schema.ts"

  - name: "api-endpoint-generator"
    description: "Generate API endpoints following our REST conventions"
    instructions: |
      When generating API endpoints:
      1. Use the controller-service-repository pattern in src/
      2. Validate inputs with Zod schemas in src/schemas/
      3. Return responses using the ResponseBuilder from src/utils/response.ts
      4. Add rate limiting decorators for write operations
      5. Include OpenAPI JSDoc comments for Swagger generation
    files:
      - "src/controllers/*.ts"
      - "src/services/*.ts"
      - "src/schemas/*.ts"
```

### Use skills in practice

In Copilot Chat, your team members can now say:

```
Using the db-migration-helper skill, create a migration that adds
a "preferences" JSONB column to the users table
```

## Step 3: CLI Automation Pipelines

The Copilot CLI can be scripted for automated workflows. Build a pre-commit quality pipeline:

### Create a pre-commit hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh

echo "🤖 Running Copilot-powered pre-commit checks..."

# Step 1: Auto-generate missing tests for changed files
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | grep -v '\.test\.')

for file in $CHANGED_FILES; do
  TEST_FILE="${file%.ts}.test.ts"
  if [ ! -f "$TEST_FILE" ]; then
    echo "⚠️  Missing test file: $TEST_FILE"
    echo "   Run: ghcp 'Generate unit tests for $file'"
  fi
done

# Step 2: Check for TODO comments that need tickets
TODOS=$(git diff --cached | grep -E '^\+.*TODO(?!.*#[0-9])' | head -5)
if [ -n "$TODOS" ]; then
  echo "⚠️  New TODOs without ticket references:"
  echo "$TODOS"
  echo "   Add a ticket reference: // TODO(#123): description"
fi

# Step 3: Validate commit message format
COMMIT_MSG_FILE=$1
if [ -n "$COMMIT_MSG_FILE" ]; then
  ghcp --quiet "Check if this commit message follows conventional commits format: $(cat $COMMIT_MSG_FILE)"
fi

echo "✅ Pre-commit checks complete"
```

### Build a release automation script

Create `scripts/release.sh`:

```bash
#!/bin/bash
set -euo pipefail

VERSION=$1
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

echo "📋 Generating changelog for $VERSION..."

# Use Copilot CLI to generate a human-readable changelog
CHANGELOG=$(git log "${PREV_TAG}..HEAD" --oneline | \
  ghcp --stdin "Organize these commits into a changelog with sections:
    ## Features, ## Bug Fixes, ## Performance, ## Breaking Changes.
    Write user-friendly descriptions, not raw commit messages.")

echo "$CHANGELOG" > CHANGELOG-${VERSION}.md

echo "🏷️  Creating release tag..."
git tag -a "v${VERSION}" -m "Release ${VERSION}"

echo "✅ Release $VERSION prepared. Review CHANGELOG-${VERSION}.md before pushing."
```

## Step 4: MCP Server for Custom Tools

The Model Context Protocol (MCP) lets you connect Copilot to external tools and data sources. Build a custom MCP server that exposes your team's internal services.

### Create the MCP server

Create `src/mcp-server.ts`:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "team-tools", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Tool: Query your team's feature flag service
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "check_feature_flag",
      description: "Check if a feature flag is enabled for a given environment",
      inputSchema: {
        type: "object" as const,
        properties: {
          flag: { type: "string", description: "Feature flag name" },
          environment: {
            type: "string",
            enum: ["development", "staging", "production"],
            description: "Target environment",
          },
        },
        required: ["flag", "environment"],
      },
    },
    {
      name: "query_error_logs",
      description: "Search recent error logs from the production monitoring system",
      inputSchema: {
        type: "object" as const,
        properties: {
          service: { type: "string", description: "Service name" },
          severity: {
            type: "string",
            enum: ["error", "critical", "warning"],
          },
          hours: {
            type: "number",
            description: "Look back N hours (default: 24)",
          },
        },
        required: ["service"],
      },
    },
    {
      name: "get_runbook",
      description: "Retrieve the incident runbook for a given service or alert",
      inputSchema: {
        type: "object" as const,
        properties: {
          topic: { type: "string", description: "Service name or alert type" },
        },
        required: ["topic"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "check_feature_flag": {
      // In production, this calls your feature flag API
      const flag = args?.flag as string;
      const env = args?.environment as string;
      const mockFlags: Record<string, Record<string, boolean>> = {
        "new-checkout": { development: true, staging: true, production: false },
        "dark-mode": { development: true, staging: true, production: true },
      };
      const enabled = mockFlags[flag]?.[env] ?? false;
      return {
        content: [
          {
            type: "text",
            text: `Feature flag "${flag}" in ${env}: ${enabled ? "✅ ENABLED" : "❌ DISABLED"}`,
          },
        ],
      };
    }

    case "query_error_logs": {
      const service = args?.service as string;
      const severity = (args?.severity as string) || "error";
      const hours = (args?.hours as number) || 24;
      return {
        content: [
          {
            type: "text",
            text: `Error logs for ${service} (${severity}+, last ${hours}h):\n` +
              `- [2h ago] TimeoutError: Database connection pool exhausted (5 occurrences)\n` +
              `- [6h ago] ValidationError: Invalid email format in /api/users (12 occurrences)\n` +
              `- [18h ago] RateLimitError: Third-party API rate limit exceeded (3 occurrences)`,
          },
        ],
      };
    }

    case "get_runbook": {
      const topic = args?.topic as string;
      return {
        content: [
          {
            type: "text",
            text: `## Runbook: ${topic}\n\n` +
              `### Symptoms\n- Elevated error rates on ${topic}\n\n` +
              `### Steps\n1. Check service health: \`kubectl get pods -l app=${topic}\`\n` +
              `2. Review recent deployments: \`gh run list --workflow=deploy\`\n` +
              `3. Check database connections: \`psql -c "SELECT count(*) FROM pg_stat_activity"\`\n` +
              `4. If connection pool exhausted, restart: \`kubectl rollout restart deployment/${topic}\`\n\n` +
              `### Escalation\nIf unresolved after 15 min, page the on-call SRE.`,
          },
        ],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Team tools MCP server running on stdio");
}

main().catch(console.error);
```

### Register the MCP server

Add to your VS Code settings or `.vscode/mcp.json`:

```json
{
  "servers": {
    "team-tools": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "src/mcp-server.ts"]
    }
  }
}
```

Now in Copilot Chat you can ask:

```
Is the new-checkout feature flag enabled in production?
Show me recent errors for the auth-service
Get the runbook for database-connection-pool alerts
```

## Step 5: Architecting AI-Augmented Workflows

Design a complete development workflow that leverages Copilot at every stage:

### The AI-augmented development lifecycle

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   Planning   │────▶│   Coding     │────▶│   Review       │
│  Copilot:    │     │  Copilot:    │     │  Copilot:      │
│  • Break down│     │  • Ghost text│     │  • Code review  │
│    tickets   │     │  • Agent mode│     │  • PR summary   │
│  • Estimate  │     │  • TDD       │     │  • Security scan│
└─────────────┘     └──────────────┘     └────────────────┘
       ▲                                         │
       │            ┌──────────────┐              │
       └────────────│  Monitoring  │◀─────────────┘
                    │  Copilot:    │
                    │  • Log analysis│
                    │  • Runbooks  │
                    │  • Incident  │
                    │    response  │
                    └──────────────┘
```

### Implementing the lifecycle

Create `scripts/ai-workflow.ts`:

```typescript
interface WorkflowStage {
  name: string;
  copilotTools: string[];
  automationLevel: "manual" | "assisted" | "autonomous";
  triggers: string[];
}

const developmentLifecycle: WorkflowStage[] = [
  {
    name: "Planning",
    copilotTools: ["copilot-chat", "custom-skills"],
    automationLevel: "assisted",
    triggers: ["New issue created", "Sprint planning meeting"],
  },
  {
    name: "Implementation",
    copilotTools: ["ghost-text", "agent-mode", "inline-chat", "mcp-tools"],
    automationLevel: "assisted",
    triggers: ["Branch created", "Developer starts coding"],
  },
  {
    name: "Testing",
    copilotTools: ["test-generation", "agent-mode"],
    automationLevel: "autonomous",
    triggers: ["PR opened", "Code pushed"],
  },
  {
    name: "Review",
    copilotTools: ["code-review", "pr-summary", "security-scan"],
    automationLevel: "autonomous",
    triggers: ["PR ready for review"],
  },
  {
    name: "Deployment",
    copilotTools: ["copilot-cli", "mcp-tools"],
    automationLevel: "assisted",
    triggers: ["PR merged", "Release tag created"],
  },
  {
    name: "Monitoring",
    copilotTools: ["error-analysis", "runbook-lookup", "incident-response"],
    automationLevel: "autonomous",
    triggers: ["Alert fired", "Error rate spike"],
  },
];

// Determine which tools to invoke at each stage
function getActiveTools(stage: string): string[] {
  const found = developmentLifecycle.find((s) => s.name === stage);
  return found?.copilotTools ?? [];
}

export { developmentLifecycle, getActiveTools };
```

## 🎯 Capstone: Build a Developer Productivity Toolkit

Combine everything into a unified toolkit for your team:

1. **Custom MCP Server** with at least 3 tools (feature flags, error logs, documentation lookup)
2. **Team Skills Manifest** encoding your coding standards and patterns
3. **CLI Automation Script** that runs quality checks on every commit
4. **Copilot Extension** that connects to one internal service

### Acceptance criteria

- [ ] MCP server starts successfully and responds to tool calls
- [ ] Skills are recognized in Copilot Chat when prefixed with skill name
- [ ] Pre-commit hook runs and catches missing tests/TODOs
- [ ] Extension responds to queries with relevant internal docs
- [ ] A README documents how teammates can install and use the toolkit

## 🎯 What You Learned

- Building custom Copilot extensions with Express and TypeScript
- Creating team-specific skills via `.github/copilot-skills.yml`
- Automating development workflows with the Copilot CLI
- Building MCP servers to connect Copilot to external tools
- Architecting AI-augmented development lifecycles
- Combining multiple Copilot capabilities into a cohesive toolkit

## 📚 Glossary

- **MCP (Model Context Protocol)**: An open protocol for connecting AI models to external tools and data sources
- **Copilot Extension**: A custom server that extends Copilot's capabilities for your organization
- **Copilot Skill**: A reusable set of instructions and context scoped to specific tasks
- **Stdio transport**: A communication channel using standard input/output streams
- **JSON-RPC**: The remote procedure call protocol used by MCP

## ➡️ Next Steps

You've mastered Copilot for development! Explore related tracks:
- 🟢 [Copilot for DevOps: AI-Assisted Infrastructure](/Learn-GHCP/courses/persona/devops-beginner/)
- 🟢 [Copilot for Data Science: AI-Powered Analysis](/Learn-GHCP/courses/persona/data-scientist-beginner/)
