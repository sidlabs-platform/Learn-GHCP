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

# 🔴 Design a CLI Automation Pipeline

In this advanced course you'll move beyond interactive use and turn Copilot CLI into an **automation engine**. You'll build a production-grade pipeline that uses Copilot CLI programmatically — integrating with MCP servers, running in CI/CD, and orchestrating autonomous code review workflows. This is where Copilot CLI stops being a chat tool and becomes infrastructure.

## Prerequisites

- Completed the intermediate course: [Build a Multi-Step Workflow with Plan Mode](/Learn-GHCP/courses/copilot-cli/copilot-cli-intermediate/)
- Strong familiarity with shell scripting (Bash or PowerShell)
- Experience with Docker and GitHub Actions
- Node.js 20+ and TypeScript basics
- Understanding of MCP fundamentals (see [What is MCP?](/Learn-GHCP/courses/mcp/mcp-beginner/) if needed)

### Verify Your Setup

```bash
ghcp --version && docker --version && node --version
```

## The Challenge

**Design and implement an autonomous code review pipeline** that:

1. Triggers on every pull request
2. Uses Copilot CLI to analyze changed files
3. Connects to an MCP server for project-specific context (e.g., style guide, architecture docs)
4. Posts review comments back to the PR
5. Runs in GitHub Actions with proper security controls

This is an open-ended challenge. The sections below provide architectural guidance and working code, but the final design decisions are yours.

## Part 1 — Autopilot Mode

Autopilot mode lets Copilot execute tasks autonomously — reading files, running commands, making edits — without asking for approval at each step. This is the foundation for automation pipelines.

### When to Use Autopilot

| Scenario | Mode | Why |
|----------|------|-----|
| Exploring unfamiliar code | Interactive | You need to steer the conversation |
| Building a feature step-by-step | Plan mode | You want review points between steps |
| Running a well-defined pipeline | Autopilot | The task is clear and repeatable |
| Batch processing many files | Autopilot | Manual approval doesn't scale |

### Safety Considerations

Autopilot gives the AI agent broad permissions. Before using it in production:

```
┌───────────────────────────────────────────────────────┐
│              Autopilot Safety Checklist                │
│                                                       │
│  ✅  Run in a sandboxed environment (container/VM)    │
│  ✅  Limit file system access to the project dir      │
│  ✅  Use read-only tokens where possible              │
│  ✅  Set timeout limits on execution                  │
│  ✅  Log all tool invocations for audit               │
│  ✅  Review output before merging any changes         │
│  ✅  Never pass secrets as prompt text                │
└───────────────────────────────────────────────────────┘
```

> ⚠️ **Critical:** Never run autopilot with write access to production databases or deployment credentials. Always sandbox.

### Configuring Autopilot Behavior

You can guide autopilot behavior through the system prompt in an extension file:

```markdown
<!-- .github/extensions/code-reviewer.md -->
---
name: code-reviewer
description: Automated code review agent for pull requests.
---

# Code Reviewer

You are a code review agent. When analyzing a pull request:

1. Read every changed file using git diff.
2. Check for: bugs, security issues, performance problems, missing error handling.
3. Ignore: style/formatting issues, minor naming preferences.
4. For each issue found, output structured JSON:
   {"file": "path", "line": 42, "severity": "warning", "message": "description"}
5. If no issues found, output: {"status": "clean"}

Do NOT modify any files. This is a read-only review.
```

This extension constrains what autopilot will do — it provides a well-defined scope instead of open-ended autonomy.

## Part 2 — Programmatic / Scripting Mode

For automation, you need to call Copilot CLI from scripts rather than interactive sessions. This means using non-interactive flags, piping input/output, and handling exit codes.

### Non-Interactive Invocation

Run a single prompt and capture the output:

```bash
echo "Explain what this function does: $(cat src/utils/parser.ts)" | ghcp --no-interactive
```

### Structured Output

For pipeline consumption, request structured output explicitly:

```bash
cat src/routes/users.ts | ghcp --no-interactive <<'PROMPT'
Analyze this Express route handler for security vulnerabilities.
Return your findings as a JSON array:
[{"line": number, "severity": "high"|"medium"|"low", "issue": "description"}]
Return ONLY the JSON array, no other text.
PROMPT
```

### Exit Code Handling

In automation scripts, always check exit codes:

```bash
#!/bin/bash
set -euo pipefail

OUTPUT=$(echo "Review this code for bugs: $(cat "$1")" | ghcp --no-interactive 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "ERROR: Copilot CLI failed with exit code $EXIT_CODE" >&2
    echo "$OUTPUT" >&2
    exit 1
fi

echo "$OUTPUT"
```

### Environment Variables for CI

When running in CI, configure Copilot CLI through environment variables:

| Variable | Purpose | Example |
|----------|---------|---------|
| `GITHUB_TOKEN` | Authentication token | `${{ secrets.GITHUB_TOKEN }}` |
| `COPILOT_MODEL` | Default model to use | `gpt-4o` |
| `NO_COLOR` | Disable ANSI color output | `1` |

## Part 3 — Building Automation Pipelines

Now let's combine these pieces into a real pipeline. The following script reviews all changed files in a pull request:

### The Review Pipeline Script

```bash
#!/bin/bash
# scripts/review-pipeline.sh
# Automated code review using Copilot CLI
set -euo pipefail

PR_NUMBER="${1:?Usage: review-pipeline.sh <pr-number>}"
REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set}"

echo "🔍 Starting code review for PR #${PR_NUMBER}..."

# Step 1: Get the list of changed files
CHANGED_FILES=$(gh pr diff "$PR_NUMBER" --name-only)

if [ -z "$CHANGED_FILES" ]; then
    echo "No changed files found. Exiting."
    exit 0
fi

echo "Files to review:"
echo "$CHANGED_FILES" | sed 's/^/  - /'

# Step 2: Build context from changed files
CONTEXT=""
while IFS= read -r file; do
    if [ -f "$file" ]; then
        CONTEXT+="
--- File: ${file} ---
$(cat "$file")
"
    fi
done <<< "$CHANGED_FILES"

# Step 3: Get the diff for review
DIFF=$(gh pr diff "$PR_NUMBER")

# Step 4: Run the review through Copilot CLI
REVIEW_PROMPT=$(cat <<'EOF'
You are reviewing a pull request. Analyze the following diff and source files.

Focus on:
- Bugs and logic errors
- Security vulnerabilities
- Missing error handling
- Performance issues

Ignore:
- Style and formatting
- Minor naming suggestions

For each issue, output a line in this format:
ISSUE|<file>|<line>|<severity>|<description>

If no issues found, output: CLEAN

Diff:
EOF
)

REVIEW_OUTPUT=$(echo "${REVIEW_PROMPT}${DIFF}" | ghcp --no-interactive 2>&1) || {
    echo "⚠️ Copilot CLI returned an error. Falling back to manual review."
    exit 0
}

# Step 5: Parse and post results
if echo "$REVIEW_OUTPUT" | grep -q "^CLEAN"; then
    echo "✅ No issues found."
    gh pr comment "$PR_NUMBER" --body "🤖 **Automated Review:** No issues found. LGTM! ✅"
else
    echo "⚠️ Issues found:"
    echo "$REVIEW_OUTPUT" | grep "^ISSUE|" | while IFS='|' read -r _ file line severity desc; do
        echo "  [$severity] $file:$line — $desc"
    done

    COMMENT_BODY="🤖 **Automated Review Found Issues:**\n\n"
    COMMENT_BODY+=$(echo "$REVIEW_OUTPUT" | grep "^ISSUE|" | while IFS='|' read -r _ file line severity desc; do
        echo "- **[$severity]** \`$file:$line\` — $desc"
    done)

    gh pr comment "$PR_NUMBER" --body "$COMMENT_BODY"
fi

echo "🏁 Review complete."
```

### Verifying the Pipeline Locally

Test the script against a real PR before deploying to CI:

```bash
export GITHUB_REPOSITORY="your-org/your-repo"
chmod +x scripts/review-pipeline.sh
./scripts/review-pipeline.sh 42
```

**What success looks like:** The script prints the list of changed files, runs the review, and either shows "No issues found" or lists specific issues with file/line references.

## Part 4 — MCP Server Integration

MCP servers let you give Copilot CLI access to external data — project documentation, databases, API schemas, or custom tools. For an automation pipeline, this means Copilot can reference your team's coding standards, architecture docs, or issue tracker.

### Configuring MCP Servers for CI

Create an MCP configuration that provides project context:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "project-context": {
      "command": "node",
      "args": ["./mcp-servers/project-context/index.js"],
      "env": {
        "DOCS_DIR": "./docs"
      }
    }
  }
}
```

### Building a Custom Context Server

Here's a minimal MCP server that exposes your project's documentation as searchable context:

```typescript
// mcp-servers/project-context/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const server = new McpServer({
  name: "project-context",
  version: "1.0.0",
});

const docsDir = process.env.DOCS_DIR || "./docs";

server.tool(
  "get_coding_standards",
  "Retrieve the team's coding standards and style guide",
  {},
  async () => {
    const standardsPath = path.join(docsDir, "coding-standards.md");
    if (!fs.existsSync(standardsPath)) {
      return { content: [{ type: "text", text: "No coding standards file found." }] };
    }
    const content = fs.readFileSync(standardsPath, "utf-8");
    return { content: [{ type: "text", text: content }] };
  }
);

server.tool(
  "get_architecture_doc",
  "Retrieve architecture documentation for a specific component",
  { component: z.string().describe("Component name (e.g., 'auth', 'api', 'database')") },
  async ({ component }) => {
    const docPath = path.join(docsDir, "architecture", `${component}.md`);
    if (!fs.existsSync(docPath)) {
      return { content: [{ type: "text", text: `No architecture doc found for: ${component}` }] };
    }
    const content = fs.readFileSync(docPath, "utf-8");
    return { content: [{ type: "text", text: content }] };
  }
);

server.tool(
  "search_docs",
  "Search project documentation for a keyword or phrase",
  { query: z.string().describe("Search term to find in docs") },
  async ({ query }) => {
    const results: string[] = [];
    const files = fs.readdirSync(docsDir, { recursive: true }) as string[];

    for (const file of files) {
      const fullPath = path.join(docsDir, file);
      if (!fs.statSync(fullPath).isFile()) continue;
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.toLowerCase().includes(query.toLowerCase())) {
        const lines = content.split("\n");
        const matchingLines = lines
          .filter(l => l.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3);
        results.push(`**${file}:**\n${matchingLines.join("\n")}`);
      }
    }

    return {
      content: [{
        type: "text",
        text: results.length > 0 ? results.join("\n\n") : `No results for: ${query}`,
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

> 💡 **Tip:** For a deep dive into building MCP servers, see the [MCP course track](/Learn-GHCP/courses/mcp/mcp-beginner/). This section focuses on integrating existing servers into CLI automation.

## Part 5 — CLI Extension Architecture

Extensions customize Copilot CLI's behavior without modifying its source code. Understanding how they work internally helps you build better automation.

### Extension Discovery

```
┌──────────────────────────────────────────────────┐
│            Extension Discovery Order              │
│                                                  │
│  1. .github/extensions/*.md   (project-scoped)   │
│  2. ~/.copilot/extensions/*.md (user-scoped)     │
│  3. MCP servers from config   (tool providers)   │
│                                                  │
│  Project extensions override user extensions     │
│  when names conflict.                            │
└──────────────────────────────────────────────────┘
```

### Extension File Anatomy

Every extension is a Markdown file with YAML frontmatter:

```markdown
---
name: review-bot
description: Automated code review with project-specific rules.
tools:
  - name: check_style
    description: Verify code follows the project's style guide.
  - name: check_security
    description: Scan for common security anti-patterns.
---

# Review Bot

You are a code review assistant specialized in this project.

## Rules
- Use the project's coding standards from the MCP context server.
- Flag security issues as HIGH severity.
- Flag style violations as LOW severity.
- Always explain WHY something is an issue, not just WHAT.

## Output Format
Return findings as structured text, one per line.
```

The frontmatter declares metadata and tool interfaces. The Markdown body becomes the system prompt — it shapes the AI's behavior when this extension is active.

> 💡 **Tip:** For a complete guide to building extensions, see the [CLI Plugins course track](/Learn-GHCP/courses/plugins/cli-plugins-beginner/).

## Part 6 — The Communication Model

Understanding how Copilot CLI communicates with AI models and MCP servers helps you debug pipeline issues and optimize performance.

### Request Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│   User /   │     │  Copilot   │     │  AI Model  │     │    MCP     │
│   Script   │────▶│    CLI     │────▶│  (API)     │────▶│  Servers   │
│            │     │            │     │            │     │            │
│  prompt    │     │ + context  │     │ + tool     │     │ + execute  │
│  input     │     │ + history  │     │   calls    │     │   tools    │
│            │◀────│            │◀────│            │◀────│            │
│  output    │     │ + format   │     │ + response │     │ + results  │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
```

### The Tool Call Cycle

When Copilot decides it needs external data:

1. **Model requests a tool call** — e.g., `get_coding_standards`
2. **CLI routes the call** to the appropriate MCP server
3. **MCP server executes** the tool and returns results
4. **CLI passes results** back to the model
5. **Model incorporates** the results into its response

This cycle can repeat multiple times in a single interaction as the model gathers information.

### Debugging Communication Issues

When a pipeline step fails, check each layer:

| Layer | How to Debug | Common Issues |
|-------|-------------|---------------|
| Script → CLI | Check exit codes and stderr | Missing arguments, auth failure |
| CLI → Model | Use verbose logging | Token expired, rate limited |
| Model → MCP | Check MCP server logs | Server crashed, tool not found |
| MCP → External | Check external service | Database down, API rate limit |

## Part 7 — Production Deployment

### GitHub Actions Workflow

Deploy the review pipeline as a GitHub Actions workflow:

```yaml
# .github/workflows/copilot-review.yml
name: Copilot Code Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Copilot CLI
        run: npm install -g @githubnext/github-copilot-cli

      - name: Configure MCP servers
        run: |
          mkdir -p ~/.copilot
          cat > ~/.copilot/mcp-config.json << 'EOF'
          {
            "mcpServers": {
              "github": {
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-github"],
                "env": {
                  "GITHUB_PERSONAL_ACCESS_TOKEN": "${{ secrets.GITHUB_TOKEN }}"
                }
              }
            }
          }
          EOF

      - name: Run review pipeline
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
        run: |
          chmod +x scripts/review-pipeline.sh
          ./scripts/review-pipeline.sh ${{ github.event.pull_request.number }}
```

### Docker Container for Isolated Runs

For stronger isolation, run the pipeline inside a container:

```dockerfile
# Dockerfile.review
FROM node:20-slim

RUN npm install -g @githubnext/github-copilot-cli && \
    apt-get update && apt-get install -y git gh && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY scripts/review-pipeline.sh /usr/local/bin/review-pipeline
RUN chmod +x /usr/local/bin/review-pipeline

ENTRYPOINT ["review-pipeline"]
```

Build and run:

```bash
docker build -f Dockerfile.review -t copilot-reviewer .
docker run --rm \
  -e GITHUB_TOKEN="$GITHUB_TOKEN" \
  -e GITHUB_REPOSITORY="$GITHUB_REPOSITORY" \
  -v "$(pwd):/workspace" \
  copilot-reviewer 42
```

## Part 8 — Performance Optimization

### Context Window Management

In automation, every token counts. Optimize context to get better results with lower latency and cost.

| Technique | How | Impact |
|-----------|-----|--------|
| **Send diffs, not full files** | Use `git diff` instead of full file contents | 60-90% token reduction |
| **Truncate large files** | Only include the relevant function/class | Fewer irrelevant tokens |
| **Batch small files** | Review related files together | Fewer API round-trips |
| **Cache repeated context** | Store style guide in MCP server | Avoid re-sending static docs |

### Reducing Latency

```
┌──────────────────────────────────────────────┐
│           Latency Budget (typical)            │
│                                              │
│  Network to API     ████░░░░░░   200-500ms   │
│  Model inference    ████████░░   2-8s         │
│  MCP tool calls     ██░░░░░░░░   100-300ms   │
│  Total per review   ████████████ 3-10s        │
│                                              │
│  Parallel file reviews cut wall-clock time   │
│  by up to 5× for large PRs.                 │
└──────────────────────────────────────────────┘
```

**Strategies:**

1. **Parallelize file reviews** — Review independent files concurrently
2. **Use faster models for triage** — Screen with a fast model, deep-review only flagged files
3. **Set hard timeouts** — Don't let a single review block the pipeline

## Part 9 — Security Considerations

### Token Management

| Principle | Implementation |
|-----------|---------------|
| **Least privilege** | Use tokens with minimum required scopes |
| **No secrets in prompts** | Pass secrets via environment variables, never as prompt text |
| **Token rotation** | Use short-lived tokens from GitHub Actions, not long-lived PATs |
| **Audit trail** | Log which tools were invoked and what data was accessed |

### Scope Control

Limit what Copilot CLI can access in automation:

```bash
# Good: read-only access, scoped to specific directory
ghcp --no-interactive --read-only --workspace ./src <<< "Review this code"

# Bad: unrestricted access in automation
ghcp <<< "Fix all the bugs and push to main"
```

> ⚠️ **Rule of Thumb:** In automation, Copilot should **read and report** — not write and deploy. Keep human approval in the loop for any changes that reach production.

### Secrets Handling in CI

```yaml
# ✅ Good: secrets passed as env vars, not in commands
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
run: ./scripts/review-pipeline.sh

# ❌ Bad: secrets visible in process list and logs
run: GITHUB_TOKEN=ghp_xxxx ./scripts/review-pipeline.sh
```

## Capstone Project — Autonomous Code Review Pipeline

Bring everything together. Build a complete pipeline that:

### Requirements

1. **Triggers on PR open/update** via GitHub Actions
2. **Analyzes changed files** using Copilot CLI in non-interactive mode
3. **Loads project context** from a custom MCP server (coding standards, architecture docs)
4. **Posts structured review comments** back to the PR
5. **Handles errors gracefully** — no pipeline should break silently
6. **Runs in a Docker container** for isolation
7. **Completes within 5 minutes** for a typical PR (< 20 files)

### Success Criteria

- [ ] Pipeline runs on every PR without manual intervention
- [ ] Review comments reference specific files and line numbers
- [ ] False positive rate is low enough that developers don't ignore it
- [ ] Pipeline fails gracefully when Copilot CLI is unavailable
- [ ] No secrets are exposed in logs or prompts
- [ ] Total execution time is under the timeout limit

### Suggested Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   GitHub      │     │   GitHub     │     │   Docker     │
│   PR Event    │────▶│   Actions    │────▶│   Container  │
│              │     │   Runner     │     │              │
└──────────────┘     └──────────────┘     │  ┌────────┐  │
                                          │  │ ghcp   │  │
                                          │  │ CLI    │  │
                                          │  └───┬────┘  │
                                          │      │       │
                                          │  ┌───▼────┐  │
                                          │  │ MCP    │  │
                                          │  │ Server │  │
                                          │  └───┬────┘  │
                                          │      │       │
                                          │  ┌───▼────┐  │
                                          │  │ Review │  │
                                          │  │ Output │  │
                                          │  └────────┘  │
                                          └──────────────┘
                                                │
                                          ┌─────▼──────┐
                                          │  PR Comment │
                                          └────────────┘
```

## Architecture Decisions

| Decision | Option A | Option B | Recommended | Why |
|----------|----------|----------|-------------|-----|
| Invocation | Interactive session | Non-interactive script | **Non-interactive** | Automatable, deterministic |
| Context source | Full file contents | Diffs only | **Diffs + key files** | Balance between context and cost |
| Model choice | Fastest available | Most capable | **Fast for triage, capable for deep review** | Cost-performance balance |
| Output format | Free text | Structured JSON | **Structured** | Parseable by downstream tools |
| Isolation | Direct on runner | Docker container | **Docker** for production, **direct** for testing | Reproducibility vs. speed |
| Error handling | Fail pipeline | Warn and continue | **Warn and continue** | Review shouldn't block merges |

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Pipeline hangs indefinitely | CLI waiting for interactive input | Ensure `--no-interactive` flag is set |
| "Authentication failed" in CI | Token not configured | Check `GITHUB_TOKEN` secret in repo settings |
| MCP server crashes on startup | Missing dependencies in container | Add dependencies to Dockerfile |
| Review output is empty | Diff was too large for context window | Send file-by-file instead of full diff |
| Rate limit errors from AI API | Too many concurrent reviews | Add retry logic with exponential backoff |
| Docker build fails | Node.js version mismatch | Pin to `node:20-slim` in Dockerfile |

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Autopilot mode** | Copilot CLI mode where the agent executes tasks autonomously without step-by-step approval |
| **Non-interactive mode** | Running Copilot CLI from scripts with piped input/output instead of a REPL session |
| **MCP server** | An external process that exposes tools to AI clients via the Model Context Protocol |
| **Extension** | A Markdown file that customizes Copilot CLI behavior and registers tools |
| **Pipeline** | A sequence of automated steps (script → CLI → model → MCP → output) |
| **Context window** | The token limit of an AI model — determines how much text it can consider at once |
| **Tool call** | When the AI model requests execution of an external function (e.g., read a file, query a database) |
| **Structured output** | AI responses in a parseable format (JSON, delimited text) for downstream processing |
| **Circuit breaker** | A pattern that stops retrying a failing service after repeated failures |
| **Exponential backoff** | Progressively increasing wait times between retry attempts |
| **Least privilege** | Security principle — grant only the minimum permissions needed |
| **stdio transport** | MCP communication via standard input/output between parent and child processes |

## 🎯 What You Learned

- When and how to use autopilot mode safely
- Running Copilot CLI programmatically from shell scripts
- Building end-to-end automation pipelines with error handling
- Integrating custom MCP servers for project-specific context
- How CLI extensions work and how they shape agent behavior
- The full request flow: script → CLI → model → MCP → output
- Deploying pipelines in GitHub Actions and Docker
- Performance optimization techniques for context and latency
- Security best practices for tokens, scopes, and secrets in CI

## ➡️ Next Steps

This course focused on CLI automation and pipelines. To go deeper into specific areas:

- 🔴 [Build a Production MCP Server](/Learn-GHCP/courses/mcp/mcp-advanced/) — Advanced MCP server patterns
- 🔴 [Create Advanced CLI Plugins](/Learn-GHCP/courses/plugins/cli-plugins-advanced/) — Deep dive into plugin architecture
- 🔴 [Custom Agents](/Learn-GHCP/courses/agents/custom-agents-advanced/) — Building autonomous AI agents
