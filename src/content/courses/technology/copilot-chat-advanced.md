---
title: "Copilot Chat at Scale: Team Patterns and Custom Extensions"
description: "Deploy Copilot Chat patterns across teams, create shared prompt libraries, and build custom chat participants."
track: "technology"
difficulty: "advanced"
featureRefs:
  - copilot-chat
  - copilot-skills
  - cli-plugins
personaTags:
  - developer
  - architect
  - tech-lead
technologyTags:
  - vscode
  - copilot
  - typescript
prerequisites:
  - copilot-chat-intermediate
estimatedMinutes: 60
lastGenerated: 2026-04-08
published: true
---

# 🔴 Copilot Chat at Scale: Team Patterns and Custom Extensions

You know how to use Copilot Chat effectively for individual work. Now it's time to scale those practices across your team — building shared prompt libraries, creating custom chat participants, and measuring Chat's impact on developer productivity.

## Prerequisites

- Completed **Advanced Copilot Chat** (intermediate course)
- Experience with TypeScript and the VS Code extension API
- A team or organization using GitHub Copilot Business or Enterprise
- Node.js 18+ and npm installed for extension development

## Team Prompt Libraries

Consistent AI-assisted development starts with shared, version-controlled prompts that encode your team's standards.

### Creating a Shared Instruction File

Every repository can include a `.github/copilot-instructions.md` that Copilot automatically uses as context for all Chat interactions:

```markdown
# Copilot Instructions — Acme E-Commerce Platform

## Architecture
- Hexagonal architecture: domain → application → infrastructure
- All business logic lives in `src/domain/` — no framework imports allowed
- Application services in `src/application/` orchestrate domain objects
- Infrastructure adapters in `src/infrastructure/` handle I/O (DB, HTTP, queues)

## Code Standards
- TypeScript strict mode (`"strict": true` in tsconfig.json)
- Use branded types for domain identifiers: `type UserId = string & { readonly __brand: 'UserId' }`
- Prefer `Result<T, AppError>` over try/catch for business logic errors
- All public functions must have JSDoc with `@param`, `@returns`, and `@throws`
- Maximum function length: 20 lines (extract helpers if longer)

## Database
- PostgreSQL via Prisma ORM
- All queries must use parameterized inputs (no string interpolation)
- Use database transactions for multi-table writes
- Name migrations descriptively: `20240315_add_order_status_index`

## Testing
- Vitest for unit tests (`.test.ts`), Supertest for integration (`.integration.ts`)
- Minimum 80% line coverage for `src/domain/` and `src/application/`
- Use factory functions (in `tests/factories/`) instead of raw object literals
- Never mock domain objects — only mock infrastructure adapters

## Security
- Sanitize all user input at the infrastructure boundary
- Use `zod` schemas for request validation
- Never log PII (emails, passwords, tokens)
- All environment variables accessed via `src/infrastructure/config.ts`
```

When a developer opens Chat and asks to generate code, Copilot automatically applies these constraints.

### Organizing Prompt Templates

Create a `.github/copilot-prompts/` directory with reusable prompt templates:

```
.github/copilot-prompts/
├── new-endpoint.md       # Template for creating a new REST endpoint
├── new-domain-entity.md  # Template for adding a domain entity
├── migration-guide.md    # Template for writing DB migrations
├── code-review.md        # Template for AI-assisted code review
└── incident-response.md  # Template for debugging production issues
```

**Example — `new-endpoint.md`:**

```markdown
# Create a New REST Endpoint

## Input Required
- Resource name (e.g., "orders")
- HTTP methods needed (e.g., GET, POST, PUT, DELETE)
- Authentication requirement (public, user, admin)

## Prompt
Create a new REST endpoint for the `{resource}` resource following our hexagonal
architecture:

1. **Domain entity** in `src/domain/{resource}.ts` with branded ID type and
   validation
2. **Repository interface** in `src/domain/{resource}Repository.ts`
3. **Application service** in `src/application/{resource}Service.ts`
4. **Prisma repository** in `src/infrastructure/prisma/{resource}PrismaRepository.ts`
5. **Express route** in `src/infrastructure/http/routes/{resource}Routes.ts`
6. **Zod schemas** in `src/infrastructure/http/schemas/{resource}Schemas.ts`
7. **Factory function** in `tests/factories/{resource}Factory.ts`
8. **Unit tests** for the application service
9. **Integration tests** for the route handler

Follow the patterns in the existing `products` resource.
```

Team members use these templates by pasting them into Chat with their specific parameters filled in.

### Measuring Prompt Effectiveness

Track which prompts your team uses most and how often they produce accepted code:

```typescript
// Example telemetry structure for prompt usage tracking
interface PromptUsageEvent {
  promptTemplate: string;    // e.g., "new-endpoint"
  developer: string;         // anonymized ID
  chatTurns: number;         // how many follow-ups needed
  codeAccepted: boolean;     // did the developer use the generated code?
  filesModified: number;     // how many files were changed
  timestamp: string;
}
```

Review this data monthly to refine prompts that need too many follow-up turns or have low acceptance rates.

## Custom Chat Participants

Custom chat participants extend Copilot Chat with domain-specific capabilities. They appear as new `@` mentions in the Chat panel.

### Architecture Overview

```
┌─────────────────────────────────────────┐
│           VS Code Extension              │
│  ┌─────────────────────────────────────┐ │
│  │     Chat Participant Handler        │ │
│  │  - Receives user prompt             │ │
│  │  - Gathers domain context           │ │
│  │  - Constructs system message        │ │
│  │  - Calls Language Model API         │ │
│  │  - Streams response to Chat UI      │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │     Slash Command Handlers          │ │
│  │  /deploy  /status  /config          │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Building Your First Participant: @acme

Let's build a custom chat participant called `@acme` that knows about your company's internal systems.

**Step 1 — Scaffold the extension:**

```bash
npx --package yo --package generator-code -- yo code
# Choose: New Extension (TypeScript)
# Name: copilot-acme-participant
```

**Step 2 — Register the participant in `package.json`:**

```json
{
  "contributes": {
    "chatParticipants": [
      {
        "id": "acme.chat",
        "fullName": "Acme Platform",
        "name": "acme",
        "description": "Ask about Acme's internal platform, APIs, and architecture",
        "isSticky": true,
        "commands": [
          {
            "name": "api",
            "description": "Look up an internal API endpoint and its usage"
          },
          {
            "name": "arch",
            "description": "Explain architecture decisions and patterns"
          },
          {
            "name": "runbook",
            "description": "Find runbook for an operational scenario"
          }
        ]
      }
    ]
  }
}
```

**Step 3 — Implement the handler in `src/extension.ts`:**

```typescript
import * as vscode from "vscode";

const ACME_SYSTEM_PROMPT = `You are an expert on the Acme e-commerce platform.
You have deep knowledge of:
- Our hexagonal architecture (domain/application/infrastructure layers)
- Internal APIs: Orders API, Inventory API, Payments API, Notifications API
- Database schema (PostgreSQL via Prisma)
- Deployment pipeline (GitHub Actions → AWS ECS)
- Monitoring stack (Datadog, PagerDuty)

Always reference specific file paths and code patterns from our codebase.
When discussing APIs, include the base URL, authentication method, and example payloads.`;

export function activate(context: vscode.ExtensionContext) {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ) => {
    // Build context based on the slash command
    let contextMessage = ACME_SYSTEM_PROMPT;

    if (request.command === "api") {
      contextMessage += "\nFocus on API documentation, endpoints, and usage examples.";
    } else if (request.command === "arch") {
      contextMessage += "\nFocus on architecture decisions, patterns, and rationale.";
    } else if (request.command === "runbook") {
      contextMessage += "\nProvide step-by-step operational procedures with commands.";
    }

    // Gather workspace context
    const workspaceFiles = await vscode.workspace.findFiles(
      "src/**/*.ts",
      "**/node_modules/**",
      50
    );
    const fileList = workspaceFiles.map((f) => f.fsPath).join("\n");
    contextMessage += `\n\nProject files:\n${fileList}`;

    // Call the language model
    const messages = [
      vscode.LanguageModelChatMessage.User(contextMessage),
      vscode.LanguageModelChatMessage.User(request.prompt),
    ];

    const model = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: "gpt-4o",
    });

    if (model.length > 0) {
      const response = await model[0].sendRequest(messages, {}, token);
      for await (const chunk of response.text) {
        stream.markdown(chunk);
      }
    }
  };

  const participant = vscode.chat.createChatParticipant("acme.chat", handler);
  participant.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    "images",
    "acme-icon.png"
  );
  context.subscriptions.push(participant);
}
```

**Step 4 — Test the participant:**

1. Press `F5` to launch the Extension Development Host
2. Open Chat and type `@acme How does the Orders API handle partial refunds?`
3. Try slash commands: `@acme /runbook Production database is slow`

### Adding Tool Integration

Participants can invoke tools to fetch real-time data:

```typescript
// Register a tool that queries your internal API registry
const apiLookupTool = vscode.lm.registerTool("acme_api_lookup", {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions,
    token: vscode.CancellationToken
  ) {
    const apiName = options.input.apiName as string;
    // Query your internal API registry
    const response = await fetch(
      `https://api-registry.acme.internal/v1/apis/${apiName}`
    );
    const apiDoc = await response.json();

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(apiDoc, null, 2)),
    ]);
  },
});
```

## Measuring Chat Effectiveness

### Key Metrics

Track these metrics to understand Chat's impact on your team:

| Metric | How to Measure | Target |
|--------|---------------|--------|
| **Acceptance rate** | % of Chat suggestions inserted into code | > 35% |
| **Time to first commit** | Time from task start to first meaningful commit | 20% reduction |
| **Follow-up turns** | Average Chat turns per task completion | < 5 for common tasks |
| **Prompt reuse** | How often shared prompt templates are used | > 60% of tasks |
| **Defect rate** | Bugs in AI-assisted vs. manual code | No increase |

### Copilot Metrics API

For Copilot Enterprise, use the Copilot Metrics API to pull usage data:

```bash
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/json" \
  "https://api.github.com/orgs/acme-corp/copilot/metrics" \
  | jq '.[] | {date: .date, chat_acceptances: .copilot_ide_chat.total_engaged_users}'
```

## Integrating Chat Workflows into CI

### PR Description Generation

Use Copilot Chat patterns in your CI pipeline to auto-generate PR descriptions:

```yaml
# .github/workflows/pr-enrich.yml
name: Enrich PR Description
on:
  pull_request:
    types: [opened]

jobs:
  enrich:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate PR summary
        uses: actions/github-script@v7
        with:
          script: |
            const diff = await github.rest.pulls.get({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
              mediaType: { format: 'diff' }
            });

            // Use the diff to generate a structured summary
            // following the team's PR template
            const body = `## Changes\n${diff.data}\n\n` +
              `_Auto-generated summary. Please review and edit._`;

            await github.rest.pulls.update({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
              body: body
            });
```

### AI-Assisted Code Review Comments

Set up Copilot code review to automatically run on PRs:

1. Navigate to **Repository Settings → Code Review → Copilot**
2. Enable automatic review on pull requests
3. Configure review scope (all files, or specific paths)

Copilot will leave review comments following the patterns defined in your `.github/copilot-instructions.md`.

## Building Organization-Wide Patterns

### Pattern: Architecture Decision Records (ADRs) via Chat

Create a prompt template that helps developers write ADRs using Chat:

```markdown
# ADR Prompt Template

I need to write an Architecture Decision Record. Help me structure it:

## Context
{describe the problem or requirement}

## Decision Drivers
{list the key factors influencing this decision}

## Options Considered
{list 2-4 options}

Generate a complete ADR following the format in #file:docs/adr/template.md
including pros/cons for each option and a clear recommendation
with rationale. Reference relevant files in our codebase using @workspace.
```

### Pattern: Onboarding Accelerator

Create a custom chat participant specifically for new team members:

```
@onboard What's the development setup process?
@onboard /arch Explain the payment processing flow
@onboard /conventions What testing patterns does the team use?
```

Back this participant with your team's actual documentation, ADRs, and codebase to give accurate, contextual answers.

### Pattern: Incident Response Assistant

```
@ops /incident We're seeing 500 errors on the checkout endpoint
```

The participant can:
1. Look up recent deployments via GitHub API
2. Query relevant code paths in the workspace
3. Surface runbook steps from your documentation
4. Suggest diagnostic commands to run

## Capstone Project: End-to-End Team Chat Infrastructure

Build a complete Chat infrastructure for your team:

### Part 1 — Shared Instructions (15 min)

1. Create `.github/copilot-instructions.md` encoding your team's standards
2. Create 3 prompt templates in `.github/copilot-prompts/`:
   - `new-feature.md` — Steps for implementing a new feature
   - `bug-fix.md` — Structured approach to diagnosing and fixing bugs
   - `refactor.md` — Safe refactoring checklist with Chat assistance

3. Test each template by pasting it into Chat with real parameters

### Part 2 — Custom Participant (30 min)

1. Scaffold a VS Code extension with a custom chat participant
2. Implement at least 2 slash commands relevant to your team's domain
3. Add workspace file discovery to enrich the participant's context
4. Test the participant with realistic developer questions

### Part 3 — Measurement Dashboard (15 min)

1. Define 3 key metrics you want to track for Chat usage
2. Write a script that pulls data from the Copilot Metrics API:

```typescript
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function getChatMetrics(org: string, days: number = 30) {
  const response = await octokit.request(
    "GET /orgs/{org}/copilot/metrics",
    { org }
  );

  const metrics = response.data.slice(-days);
  const summary = {
    totalChatUsers: new Set(
      metrics.flatMap((m: any) =>
        m.copilot_ide_chat ? [m.copilot_ide_chat.total_engaged_users] : []
      )
    ).size,
    avgAcceptanceRate:
      metrics.reduce((sum: number, m: any) => {
        const chat = m.copilot_ide_chat;
        return chat ? sum + (chat.total_chat_acceptances / chat.total_chats) : sum;
      }, 0) / metrics.length,
    topEditors: groupBy(metrics, (m: any) => m.copilot_ide_chat?.editor),
  };

  return summary;
}
```

3. Document how your team will review these metrics monthly

### Completion Criteria

- [ ] `.github/copilot-instructions.md` committed and tested with 3+ Chat queries
- [ ] 3 prompt templates tested and documented
- [ ] Custom chat participant running with 2+ slash commands
- [ ] Metrics script pulling real data from your organization
- [ ] README section explaining your team's Chat workflow added to the repo

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Prompt library** | A version-controlled collection of reusable prompt templates for common tasks |
| **Chat participant** | A VS Code extension that registers a custom `@` mention in Copilot Chat |
| **Copilot instructions** | A `.github/copilot-instructions.md` file that shapes all Chat responses in a repository |
| **Language Model API** | The VS Code API (`vscode.lm`) for interacting with AI models from extensions |
| **Copilot Metrics API** | A GitHub REST API endpoint for retrieving organization-wide Copilot usage statistics |
| **Tool integration** | The ability for chat participants to call external APIs or tools during a conversation |

## ➡️ Next Steps

You've built a complete Chat infrastructure for your team. Explore related courses:
- 🟢 [Getting Started with Copilot Workspace](/Learn-GHCP/courses/technology/copilot-workspace-beginner/) — Use AI-driven planning to go from issue to PR
- 🟢 [Your First Copilot Cloud Agent](/Learn-GHCP/courses/agents/copilot-agents-beginner/) — Assign issues to autonomous AI agents
