---
title: "Custom Agent Configuration and Prompt Engineering"
description: "Configure Copilot agents with custom instructions using copilot-setup-steps.yml, agent prompts, and workspace context."
track: "agents"
difficulty: "intermediate"
featureRefs:
  - copilot-agents
  - agent-mode
personaTags:
  - developer
technologyTags:
  - github
  - copilot
  - yaml
prerequisites:
  - copilot-agents-beginner
estimatedMinutes: 40
lastGenerated: 2026-04-08
published: true
---

# 🟡 Custom Agent Configuration and Prompt Engineering

In this course, you'll learn how to configure Copilot cloud agents for your specific project — from setting up the agent's environment to writing instructions that produce consistent, high-quality output.

## Prerequisites

- Completed [Your First Copilot Cloud Agent](/Learn-GHCP/courses/agents/copilot-agents-beginner/)
- A repository with at least one successful agent-created PR
- Familiarity with YAML and GitHub Actions basics

## Real-World Scenario

Your team maintains a **Node.js monorepo** with a React frontend and an Express API backend. When you assign issues to Copilot, the agent:

- Doesn't install the right dependencies
- Misses your team's coding conventions (e.g., using `pnpm` instead of `npm`)
- Doesn't run your linter before opening the PR

By the end of this course, you'll have a fully configured agent that respects your project's tooling, conventions, and quality gates.

## Configuring the Agent Environment

### copilot-setup-steps.yml

The `copilot-setup-steps.yml` file lives at `.github/copilot-setup-steps.yml` and defines the environment in which the cloud agent operates. Think of it as a **Dockerfile for the agent** — it specifies what tools, dependencies, and setup steps the agent needs before it starts coding.

```yaml
# .github/copilot-setup-steps.yml
steps:
  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: "20"

  - name: Install pnpm
    run: npm install -g pnpm@9

  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  - name: Build shared packages
    run: pnpm run build:shared
```

**Key points:**

- Each `step` follows the same syntax as GitHub Actions steps
- You can use any public action (e.g., `actions/setup-node`, `actions/setup-python`)
- The `run` field executes shell commands in the agent's environment
- Steps run in order before the agent begins its task

### Choosing the Right Runner

By default, cloud agents run on GitHub-hosted Ubuntu runners. You can specify runner requirements for projects that need specific tools:

```yaml
# .github/copilot-setup-steps.yml
steps:
  - name: Setup .NET SDK
    uses: actions/setup-dotnet@v4
    with:
      dotnet-version: "8.0"

  - name: Restore packages
    run: dotnet restore

  - name: Verify build
    run: dotnet build --no-restore
```

> 💡 **Tip:** Keep setup steps fast. The agent waits for all steps to complete before starting work. Aim for under 2 minutes of setup time.

### Environment Variables and Secrets

You can make repository secrets available to the agent's environment through the setup steps:

```yaml
# .github/copilot-setup-steps.yml
steps:
  - name: Setup environment
    run: |
      echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> $GITHUB_ENV
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

> ⚠️ **Security note:** Only expose secrets the agent truly needs. The agent can read environment variables, so avoid exposing production credentials.

## Creating Effective Agent Instructions

### .github/copilot-instructions.md

This file provides **persistent instructions** that the agent reads before every task. It's your team's coding standards, translated into natural language the agent can follow.

```markdown
<!-- .github/copilot-instructions.md -->

# Project Conventions

## Language and Framework
- This is a TypeScript monorepo using pnpm workspaces
- Frontend: React 19 with Vite
- Backend: Express.js with Prisma ORM
- Shared types live in `packages/shared/`

## Code Style
- Use named exports, not default exports
- Prefer `async/await` over `.then()` chains
- All functions must have JSDoc comments with `@param` and `@returns`
- Use `zod` for runtime input validation

## Testing
- Write tests using Vitest
- Place test files adjacent to source files: `foo.ts` → `foo.test.ts`
- Minimum coverage: all public functions must have at least one happy-path and one error test

## Git Conventions
- Branch names: `copilot/{issue-number}-{short-description}`
- Commit messages: follow Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`)
- One logical change per commit

## Do NOT
- Do not use `any` type in TypeScript
- Do not add new dependencies without updating the README
- Do not modify files in `packages/shared/` without also updating downstream consumers
```

### How Instructions Affect Agent Behavior

Without instructions, the agent makes its best guess. With instructions, it follows your conventions:

| Aspect | Without Instructions | With Instructions |
|--------|---------------------|-------------------|
| Package manager | Might use `npm` | Uses `pnpm` as specified |
| Test framework | Might use Jest | Uses Vitest as specified |
| Export style | Mixed | Named exports only |
| Commit messages | Generic | Conventional Commits |

## Prompt File Templates

For tasks you assign repeatedly, create **prompt templates** — markdown files that give the agent structured context for specific task types.

### Example: Bug Fix Template

Save this as a GitHub Issue template your team uses when assigning bugs to Copilot:

```markdown
<!-- .github/ISSUE_TEMPLATE/copilot-bugfix.md -->
---
name: "Bug Fix (Copilot)"
about: "Assign this bug to Copilot for automated fixing"
labels: ["bug", "copilot"]
assignees: copilot
---

## Bug Description
<!-- Describe the bug clearly -->

## Steps to Reproduce
1.
2.
3.

## Expected Behavior
<!-- What should happen? -->

## Actual Behavior
<!-- What happens instead? -->

## Relevant Files
<!-- List the files the agent should focus on -->
-

## Acceptance Criteria
- [ ] Bug is fixed
- [ ] Existing tests still pass
- [ ] A new regression test is added
```

### Example: Feature Template

```markdown
<!-- .github/ISSUE_TEMPLATE/copilot-feature.md -->
---
name: "Feature (Copilot)"
about: "Assign this feature to Copilot for implementation"
labels: ["enhancement", "copilot"]
assignees: copilot
---

## Feature Description
<!-- What should be built? -->

## Design Notes
<!-- Architecture or implementation hints -->

## Files to Create or Modify
<!-- Guide the agent to the right location -->
-

## Acceptance Criteria
- [ ]
- [ ]
- [ ]
```

## Monitoring Agent Sessions

### The Copilot Tab

GitHub provides an **Agents** view in your repository where you can monitor active and past agent sessions:

1. Navigate to your repository on GitHub
2. Click the **Copilot** tab (next to Actions, Projects, etc.)
3. View active sessions, their status, and logs

**Session states:**

| State | Meaning |
|-------|---------|
| 🟡 **Planning** | Agent is analyzing the issue and repo |
| 🔵 **Working** | Agent is writing code and making changes |
| 🟠 **Validating** | Agent is running checks (tests, linter, build) |
| 🟢 **Completed** | Agent has opened a PR |
| 🔴 **Failed** | Agent encountered an error it couldn't resolve |

### Reading Agent Logs

When an agent session completes (or fails), you can inspect its detailed logs:

- **Plan:** What the agent decided to do and why
- **File changes:** Which files were created, modified, or deleted
- **Tool usage:** What commands the agent ran (e.g., `pnpm test`, `pnpm lint`)
- **Errors:** Any issues the agent encountered and how it handled them

## Agent Context: What Can the Agent See?

The cloud agent has access to a specific set of context when working on a task:

```
┌─────────────────────────────────────────┐
│            Agent Context                │
├─────────────────────────────────────────┤
│ ✅ Full repository contents (files)     │
│ ✅ The assigned issue (title + body)    │
│ ✅ PR comments and review feedback      │
│ ✅ copilot-setup-steps.yml              │
│ ✅ .github/copilot-instructions.md      │
│ ✅ Repository README                    │
│ ✅ CI/CD output (test results, errors)  │
├─────────────────────────────────────────┤
│ ❌ Other repositories                   │
│ ❌ External URLs (unless fetched)       │
│ ❌ Your local environment               │
│ ❌ Private conversations / DMs          │
└─────────────────────────────────────────┘
```

> 💡 **Key insight:** The agent works with what's **in the repo**. If your coding standards, architecture decisions, or API docs aren't committed to the repository, the agent won't know about them.

## Best Practices for Agent-Friendly Repositories

### 1. Maintain a Clear README

Your README is one of the first things the agent reads. Include:

- Project structure overview
- How to install dependencies
- How to run tests
- How to build the project

### 2. Keep CI Fast and Reliable

The agent uses CI feedback to validate its work. Flaky or slow tests slow down the agent and reduce output quality.

```yaml
# Good: focused, fast test suite
pnpm test --reporter=verbose

# Avoid: full E2E suite that takes 20+ minutes
pnpm test:e2e --all --parallel=1
```

### 3. Use Typed Languages or Type Annotations

Type information helps the agent understand function signatures, expected inputs/outputs, and data shapes. TypeScript, Python with type hints, and Go all give the agent significantly more context than untyped JavaScript.

### 4. Commit Architecture Decision Records (ADRs)

If you've decided to use a specific pattern (e.g., repository pattern for data access), document it in the repo so the agent follows the same approach:

```markdown
<!-- docs/adr/001-repository-pattern.md -->
# ADR-001: Use Repository Pattern for Data Access

## Decision
All database access goes through repository classes in `src/repositories/`.

## Rationale
Separates business logic from data access, making both easier to test.
```

## Extension Challenge: Configure Agents for a Monorepo

Set up Copilot agent configuration for a monorepo with this structure:

```
my-monorepo/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend
├── packages/
│   ├── ui/           # Shared component library
│   └── utils/        # Shared utilities
├── .github/
│   ├── copilot-setup-steps.yml
│   └── copilot-instructions.md
├── pnpm-workspace.yaml
└── package.json
```

**Your tasks:**

1. Write a `copilot-setup-steps.yml` that installs Node.js 20, pnpm, all dependencies, and builds the shared packages
2. Write a `copilot-instructions.md` that tells the agent about the monorepo structure, which package manager to use, and how to run tests for each package
3. Create an issue template for assigning features to Copilot
4. Test by assigning a simple issue (e.g., "Add a `formatDate` utility to `packages/utils`")

## ➡️ Next Steps

- 🟢 [Review the beginner course](/Learn-GHCP/courses/agents/copilot-agents-beginner/) if you need a refresher
- 🔴 [Multi-Agent Orchestration and Self-Healing CI](/Learn-GHCP/courses/agents/copilot-agents-advanced/) to build production-grade agentic pipelines
