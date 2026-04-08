---
title: "Build a Full Agent Plugin Bundle"
description: "Architect a production-grade plugin bundle combining skills, hooks, and MCP integration with distribution via Git."
track: "plugins"
difficulty: "advanced"
featureRefs:
  - cli-plugins
  - copilot-skills
  - mcp-integration
personaTags:
  - developer
  - architect
technologyTags:
  - cli
  - nodejs
  - typescript
  - mcp
prerequisites:
  - cli-plugins-intermediate
estimatedMinutes: 75
lastGenerated: 2026-04-08
published: true
---

# 🔴 Build a Full Agent Plugin Bundle

In this advanced course you'll architect and build a **production-grade plugin bundle** that combines Copilot CLI extensions, a custom MCP server, and lifecycle hooks into a single distributable package. This is an open-ended, capstone-style challenge with architectural guidance rather than step-by-step hand-holding.

## The Challenge

Design and implement a **DevOps Assistant** plugin bundle that:

1. **Extension layer** — Gives Copilot CLI rich context about your CI/CD pipelines
2. **MCP server** — Exposes tools for querying GitHub Actions, reading logs, and triggering re-runs
3. **Lifecycle hooks** — Automatically attaches pipeline context when the user opens a PR-related session
4. **Distribution** — Ships as a single Git-installable bundle your whole org can adopt

By the end, a developer on your team will be able to say:

```
Why did the deploy workflow fail on PR #142? Fix the issue and re-run.
```

…and Copilot will query logs, diagnose the error, suggest a fix, and trigger a re-run — all from the terminal.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Plugin Bundle                       │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Extension    │  │  MCP Server  │  │  Hooks     │ │
│  │  (.md file)   │  │  (Node.js)   │  │  (scripts) │ │
│  │              │  │              │  │            │ │
│  │  • System    │  │  • tools/    │  │  • onStart │ │
│  │    prompt    │  │    list      │  │  • onPR    │ │
│  │  • Tool      │  │  • tools/    │  │  • onError │ │
│  │    defs      │  │    call      │  │            │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                 │                │         │
│         └────────┬────────┘                │         │
│                  ▼                         ▼         │
│           Agent Runtime  ◀──────── Event Bus         │
└─────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Role | Technology |
|-----------|------|-----------|
| **Extension** | System prompt + tool descriptions for the AI | Markdown (`.md`) |
| **MCP Server** | Exposes callable tools over JSON-RPC via stdio | Node.js / TypeScript |
| **Hooks** | React to session lifecycle events | Shell / Node.js scripts |
| **Bundle manifest** | Declares all components and their relationships | `plugin.json` |

## Part 1: Architecture Decisions

Before writing code, answer these design questions:

### When to use an Extension vs. an MCP Server

```
                        ┌──────────────────────┐
                        │ Does it need to call  │
                        │ external services?    │
                        └──────┬───────────────┘
                               │
                    ┌──── Yes ──┴── No ────┐
                    ▼                      ▼
             ┌──────────────┐     ┌──────────────┐
             │  MCP Server  │     │  Extension   │
             │  (tools via  │     │  (prompt +   │
             │   JSON-RPC)  │     │   built-in   │
             └──────────────┘     │   commands)  │
                                  └──────────────┘
```

**Use an Extension when:**
- The tool can be expressed as a shell command (`git`, `npm`, `curl`)
- No persistent state is needed between invocations
- You want zero infrastructure overhead

**Use an MCP Server when:**
- You need authenticated API calls (GitHub API, databases)
- Tools require complex logic, caching, or state
- You want to share the same tools across multiple AI clients (CLI, VS Code, etc.)

### Skills vs. Tools

| Concept | Definition | Example |
|---------|-----------|---------|
| **Tool** | A single callable function with input/output | `get_workflow_run(run_id)` |
| **Skill** | A higher-level capability composed of multiple tools + prompting | "Diagnose CI failures" |

In this bundle, the MCP server provides **tools** and the extension file defines the **skill** layer that orchestrates them.

## Part 2: JSON-RPC Protocol Deep-Dive

MCP servers communicate over **JSON-RPC 2.0** via `stdio`. Understanding the protocol is critical for debugging.

### The MCP Handshake

```
Client (CLI)                          Server (your MCP)
    │                                       │
    │──── initialize ──────────────────────▶│
    │◀─── initialize result ───────────────│
    │                                       │
    │──── initialized (notification) ──────▶│
    │                                       │
    │──── tools/list ──────────────────────▶│
    │◀─── tools/list result ───────────────│
    │                                       │
    │──── tools/call { name, arguments } ──▶│
    │◀─── tools/call result ───────────────│
```

### Implementing `tools/list`

Your MCP server must respond to `tools/list` with an array of tool definitions:

```typescript
// src/mcp-server/handlers.ts
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const TOOLS: Tool[] = [
  {
    name: "get_workflow_runs",
    description:
      "List recent workflow runs for a GitHub repository. " +
      "Returns run ID, status, conclusion, branch, and duration.",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        status: {
          type: "string",
          enum: ["completed", "in_progress", "queued", "failure"],
          description: "Filter by run status (optional)",
        },
        limit: {
          type: "number",
          description: "Max results to return (default: 10)",
        },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "get_job_logs",
    description:
      "Retrieve logs for a specific job in a workflow run. " +
      "Returns the last N lines of the log output.",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        job_id: { type: "number", description: "The job ID" },
        tail: {
          type: "number",
          description: "Number of lines from end (default: 100)",
        },
      },
      required: ["owner", "repo", "job_id"],
    },
  },
  {
    name: "rerun_workflow",
    description:
      "Re-run a failed workflow run. Requires the run ID. " +
      "Returns the new run ID and URL.",
    inputSchema: {
      type: "object" as const,
      properties: {
        owner: { type: "string", description: "Repository owner" },
        repo: { type: "string", description: "Repository name" },
        run_id: { type: "number", description: "The workflow run ID" },
      },
      required: ["owner", "repo", "run_id"],
    },
  },
];
```

### Implementing `tools/call`

Handle incoming tool invocations with a dispatcher pattern:

```typescript
// src/mcp-server/dispatcher.ts
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

const handlers: Record<string, ToolHandler> = {
  async get_workflow_runs(args) {
    const { owner, repo, status, limit = 10 } = args as {
      owner: string;
      repo: string;
      status?: string;
      limit?: number;
    };

    const response = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      status: status as "completed" | "in_progress" | "queued" | undefined,
      per_page: limit,
    });

    const runs = response.data.workflow_runs.map((run) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      url: run.html_url,
      created: run.created_at,
    }));

    return JSON.stringify(runs, null, 2);
  },

  async get_job_logs(args) {
    const { owner, repo, job_id, tail = 100 } = args as {
      owner: string;
      repo: string;
      job_id: number;
      tail?: number;
    };

    const response = await octokit.actions.downloadJobLogsForWorkflowRun({
      owner,
      repo,
      job_id,
    });

    const lines = String(response.data).split("\n");
    return lines.slice(-tail).join("\n");
  },

  async rerun_workflow(args) {
    const { owner, repo, run_id } = args as {
      owner: string;
      repo: string;
      run_id: number;
    };

    await octokit.actions.reRunWorkflow({ owner, repo, run_id });
    return JSON.stringify({
      message: `Re-run triggered for run ${run_id}`,
      url: `https://github.com/${owner}/${repo}/actions/runs/${run_id}`,
    });
  },
};

export async function dispatch(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const handler = handlers[toolName];
  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return handler(args);
}
```

### Wiring up the MCP Server entry point

```typescript
// src/mcp-server/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TOOLS } from "./handlers.js";
import { dispatch } from "./dispatcher.js";

const server = new McpServer({
  name: "devops-assistant",
  version: "1.0.0",
});

// Register each tool dynamically
for (const tool of TOOLS) {
  server.tool(
    tool.name,
    tool.description ?? "",
    tool.inputSchema.properties as Record<string, unknown>,
    async (args) => {
      try {
        const result = await dispatch(tool.name, args as Record<string, unknown>);
        return { content: [{ type: "text" as const, text: result }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DevOps Assistant MCP server running on stdio");
}

main().catch(console.error);
```

## Part 3: Lifecycle Hooks

Hooks let your plugin react to events in the CLI session. They run as shell scripts or Node.js programs triggered by the CLI runtime.

### Hook types

| Hook | Fires When | Use Case |
|------|-----------|----------|
| `onSessionStart` | User opens a new CLI session | Attach default context (repo, branch, open PRs) |
| `onPRContext` | User references a PR number | Fetch PR metadata and inject into context |
| `onToolError` | A tool invocation fails | Retry with backoff, log to telemetry |
| `onSessionEnd` | User exits the session | Clean up temp files, flush caches |

### Example: Auto-attach CI context on session start

Create a hook script that queries recent failed runs and injects them as context:

```typescript
// hooks/on-session-start.ts
import { execSync } from "child_process";

interface SessionContext {
  repoOwner: string;
  repoName: string;
  branch: string;
}

export async function onSessionStart(ctx: SessionContext): Promise<string> {
  const { repoOwner, repoName, branch } = ctx;

  // Get recent failed workflow runs for the current branch
  const result = execSync(
    `gh run list --repo ${repoOwner}/${repoName} ` +
      `--branch ${branch} --status failure --limit 3 --json databaseId,name,conclusion,createdAt`,
    { encoding: "utf-8" }
  );

  const runs = JSON.parse(result);

  if (runs.length === 0) {
    return "No recent CI failures on this branch.";
  }

  const summary = runs
    .map(
      (r: { name: string; databaseId: number; createdAt: string }) =>
        `- **${r.name}** (run ${r.databaseId}) failed at ${r.createdAt}`
    )
    .join("\n");

  return [
    "## Recent CI Failures",
    "",
    summary,
    "",
    'Ask me to "diagnose" any of these runs for details.',
  ].join("\n");
}
```

### Registering hooks in the bundle manifest

```json
// plugin.json
{
  "name": "devops-assistant",
  "version": "1.0.0",
  "components": {
    "extension": ".github/extensions/devops-assistant.md",
    "mcp": {
      "command": "npx",
      "args": ["tsx", "src/mcp-server/index.ts"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "hooks": {
      "onSessionStart": "hooks/on-session-start.ts",
      "onToolError": "hooks/on-tool-error.ts"
    }
  }
}
```

## Part 4: The Extension File (Skill Layer)

The extension file ties everything together by defining the AI's persona and orchestration logic:

```markdown
<!-- .github/extensions/devops-assistant.md -->
---
name: devops-assistant
description: >
  DevOps assistant that diagnoses CI/CD failures, reads workflow logs,
  and can trigger re-runs — all from natural language commands.
tools:
  - name: get_workflow_runs
    description: List recent workflow runs filtered by status.
  - name: get_job_logs
    description: Retrieve logs for a specific workflow job.
  - name: rerun_workflow
    description: Re-run a failed workflow.
---

# DevOps Assistant

You are an expert DevOps engineer embedded in the developer's terminal.

## Capabilities
- Query GitHub Actions workflow runs and their status
- Read job logs to diagnose failures
- Suggest fixes based on error patterns
- Trigger workflow re-runs after fixes are applied

## Diagnosis Workflow

When asked to diagnose a CI failure:
1. Call `get_workflow_runs` to find the failing run
2. Call `get_job_logs` for each failed job in that run
3. Analyze the logs for common error patterns:
   - **Dependency errors**: missing packages, version conflicts
   - **Test failures**: assertion errors, timeout issues
   - **Build errors**: type errors, syntax issues
   - **Infrastructure**: rate limits, network timeouts
4. Present findings in a structured report
5. Suggest specific code fixes with file paths and line numbers
6. Ask if the user wants to apply fixes and re-run

## Response Format

Always structure your diagnosis as:

### 🔍 Run Summary
| Field | Value |
|-------|-------|
| Run ID | ... |
| Workflow | ... |
| Branch | ... |
| Failed Jobs | ... |

### 🐛 Root Cause
<concise explanation>

### 🔧 Suggested Fix
<code changes with file paths>

### ▶️ Next Steps
<offer to apply fix and re-run>
```

## Part 5: Distribution via Git

### Bundle directory structure

```
devops-assistant-plugin/
├── plugin.json                         ← bundle manifest
├── .github/
│   └── extensions/
│       └── devops-assistant.md         ← extension (skill layer)
├── src/
│   └── mcp-server/
│       ├── index.ts                    ← MCP entry point
│       ├── handlers.ts                 ← tool definitions
│       └── dispatcher.ts               ← tool implementations
├── hooks/
│   ├── on-session-start.ts            ← session start hook
│   └── on-tool-error.ts              ← error handling hook
├── package.json
├── tsconfig.json
└── README.md
```

### Installation for consumers

Teams can install your bundle by cloning and configuring the MCP server:

```bash
# Clone the plugin bundle into a tools directory
git clone https://github.com/your-org/devops-assistant-plugin.git .devops-plugin

# Add the MCP server to the project's MCP config
cat >> .vscode/mcp.json << 'EOF'
{
  "servers": {
    "devops-assistant": {
      "command": "npx",
      "args": ["tsx", ".devops-plugin/src/mcp-server/index.ts"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
EOF

# Copy the extension file into the project
cp .devops-plugin/.github/extensions/devops-assistant.md .github/extensions/
```

### Versioning strategy

| Strategy | Mechanism | Pros | Cons |
|----------|-----------|------|------|
| **Git tags** | `git clone --branch v1.2.0` | Simple, familiar | Manual updates |
| **Git submodules** | `git submodule add` | Pinned version per project | Complex workflows |
| **npm package** | `npm install @org/devops-plugin` | Standard tooling | Requires registry |

For most teams, **Git tags** strike the best balance of simplicity and reproducibility.

## Part 6: Production Considerations

### Security

- **Never hardcode tokens.** Use environment variable references (`${GITHUB_TOKEN}`) in your MCP config.
- **Scope permissions tightly.** The `GITHUB_TOKEN` should have only `actions:read` and `actions:write`.
- **Validate tool inputs.** Always validate arguments in your dispatcher before making API calls:

```typescript
function validateOwnerRepo(owner: unknown, repo: unknown): void {
  if (typeof owner !== "string" || !/^[a-zA-Z0-9_.-]+$/.test(owner)) {
    throw new Error(`Invalid owner: ${owner}`);
  }
  if (typeof repo !== "string" || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
    throw new Error(`Invalid repo: ${repo}`);
  }
}
```

### Error handling and retries

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const backoff = delayMs * Math.pow(2, attempt - 1);
      console.error(
        `Attempt ${attempt} failed, retrying in ${backoff}ms...`
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw new Error("Unreachable");
}
```

### Observability

Add structured logging to your MCP server so you can debug issues in production:

```typescript
function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  // Log to stderr (stdout is reserved for JSON-RPC)
  console.error(JSON.stringify(entry));
}
```

> ⚠️ **Critical:** MCP servers use `stdout` for JSON-RPC communication. All diagnostic logging **must** go to `stderr`.

### Performance

| Concern | Mitigation |
|---------|-----------|
| API rate limits | Cache responses with a short TTL (60s for workflow runs) |
| Large log files | Use `tail` parameter to limit returned lines |
| Slow network | Set timeouts on all HTTP requests (30s default) |
| Memory leaks | Restart the MCP server process periodically via health checks |

## 🏆 Capstone Project

Build the complete **DevOps Assistant** plugin bundle described above. Your submission should include:

1. **A working MCP server** with at least 3 tools (`get_workflow_runs`, `get_job_logs`, `rerun_workflow`)
2. **An extension file** with a well-crafted system prompt and tool descriptions
3. **At least one lifecycle hook** (e.g., `onSessionStart`)
4. **A `plugin.json` manifest** declaring all components
5. **A README** with installation instructions, configuration, and usage examples
6. **Input validation and error handling** in all tool handlers
7. **Structured logging** to `stderr`

### Stretch goals

- Add a `get_test_failures` tool that parses JUnit XML artifacts from workflow runs
- Implement caching with configurable TTL to reduce API calls
- Add a `compare_runs` tool that diffs two workflow runs to find what changed
- Create a GitHub Actions workflow that tests the MCP server itself

### Evaluation rubric

| Criteria | Weight | What we look for |
|----------|--------|-----------------|
| **Architecture** | 25% | Clean separation of extension / MCP / hooks |
| **Tool quality** | 25% | Specific descriptions, proper input schemas |
| **Error handling** | 20% | Graceful failures, retries, validation |
| **Distribution** | 15% | Easy install, clear README, versioned |
| **Production readiness** | 15% | Logging, security, performance |

## 🎯 What You Learned

- How to architect a multi-component plugin bundle (extension + MCP + hooks)
- The JSON-RPC protocol that underpins MCP communication
- How to implement and register MCP server tools with proper schemas
- Lifecycle hooks for injecting context and handling errors
- Distribution strategies for sharing plugin bundles across an organization
- Production hardening: security, retries, logging, and performance

## ➡️ Navigation

- ⬅️ [Build a Project-Scoped CLI Extension](/Learn-GHCP/courses/plugins/cli-plugins-intermediate/) (intermediate)
- ⬅️ [Introduction to Copilot CLI Plugins](/Learn-GHCP/courses/plugins/cli-plugins-beginner/) (beginner)
