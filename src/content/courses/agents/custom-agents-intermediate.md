---
title: "Build a Custom Development Agent"
description: "Create a specialized development agent with custom instructions, tool access, and workspace awareness for your team's workflow."
track: "agents"
difficulty: "intermediate"
featureRefs:
  - copilot-agents
  - copilot-skills
personaTags:
  - developer
technologyTags:
  - github
  - copilot
  - yaml
  - markdown
prerequisites:
  - custom-agents-beginner
estimatedMinutes: 40
lastGenerated: 2026-04-08
published: true
---

# 🟡 Build a Custom Development Agent

In this course, you'll build a **custom code review agent** — a specialized Copilot agent tailored to your team's coding standards, security policies, and review process. Along the way, you'll learn the core techniques for designing any custom agent.

## Scenario: The Problem

Your team's pull requests keep getting the same review feedback:

- Missing error handling on API calls
- Inconsistent naming conventions
- No input validation on public endpoints
- Console.log statements left in production code

You'll build an agent that catches these issues automatically before a human reviewer ever sees the PR.

## Step 1: Define Agent Instructions

Custom agents start with a clear **system prompt** — the instructions that shape the agent's behavior. Create a file in your repo:

**`.github/copilot-instructions.md`**

```markdown
# Code Review Agent Instructions

You are a senior code reviewer for our Node.js/TypeScript team.

## Review Priorities (in order)

1. **Security**: Flag SQL injection, XSS, hardcoded secrets, unsanitized input
2. **Error handling**: Every async call needs try/catch or .catch(); no swallowed errors
3. **Input validation**: Public API endpoints must validate request body with zod or joi
4. **Naming**: camelCase for variables/functions, PascalCase for classes/types, UPPER_SNAKE for constants
5. **No debug artifacts**: Flag console.log, debugger statements, TODO/FIXME without issue links

## Review Style

- Be specific: reference the exact line and suggest a concrete fix
- Explain *why* something is a problem, not just *what* to change
- Categorize findings as 🔴 Critical, 🟡 Warning, or 🔵 Suggestion
- If code is good, say so — don't manufacture issues

## Project Context

- Runtime: Node.js 20 with TypeScript 5.x
- Framework: Express.js with zod for validation
- Database: PostgreSQL via Prisma ORM
- Auth: JWT tokens validated by middleware in src/middleware/auth.ts
- Tests: Vitest with >80% coverage requirement
```

> 💡 **How it works:** When Copilot's agent mode is active in a repo with `.github/copilot-instructions.md`, it automatically incorporates these instructions into its system context. This shapes every interaction — not just code review.

## Step 2: Add Repository-Level Custom Instructions

For more granular control, you can provide folder-specific instructions. Create additional instruction files at the directory level:

**`src/api/.copilot-instructions.md`**

```markdown
# API Route Instructions

All route handlers in this directory must:
1. Use the `validate()` middleware with a zod schema before the handler
2. Wrap handler logic in the `asyncHandler()` utility from src/utils/async.ts
3. Return responses using the `ApiResponse.success()` or `ApiResponse.error()` helpers
4. Never access `req.body` directly — use the validated `req.validated` property
```

This layered approach means the agent gets general instructions for the whole repo plus specific instructions for subdirectories.

## Step 3: Configure Tool Access with MCP

For advanced agent capabilities, connect external tools via **MCP (Model Context Protocol)** servers. Create a VS Code MCP configuration:

**`.vscode/mcp.json`**

```json
{
  "servers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_TOKEN}"
      }
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "${workspaceFolder}/src"
      ]
    }
  }
}
```

This gives the agent access to:

| MCP Server | Capabilities |
|-----------|-------------|
| **github** | Read PRs, issues, commit history, repo metadata |
| **filesystem** | Read/write files within the `src/` directory |

> 💡 **Security note:** Scope filesystem access to specific directories. Never give an agent write access to your entire home directory.

## Step 4: Test Your Agent

Now let's test the code review agent with a deliberately flawed file.

Create a test file with common issues:

**`test-review/bad-endpoint.ts`**

```typescript
import { Router } from "express";
import { db } from "../db";

const router = Router();

// Issue 1: No input validation
// Issue 2: No error handling
// Issue 3: SQL injection vulnerability
// Issue 4: Hardcoded secret
// Issue 5: console.log left in
router.post("/users", async (req, res) => {
  console.log("Creating user:", req.body);
  const API_KEY = "sk-1234567890abcdef";

  const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;
  const existing = await db.$queryRawUnsafe(query);

  if (existing) {
    res.status(409).json({ error: "exists" });
  }

  const user = await db.user.create({ data: req.body });
  res.json(user);
});

export default router;
```

Open the Copilot Chat panel in agent mode and type:

```
Review test-review/bad-endpoint.ts against our team's coding standards.
Flag all issues with severity levels and suggest concrete fixes.
```

### Expected Agent Output

The agent should identify at least these issues:

| # | Severity | Issue | Line |
|---|----------|-------|------|
| 1 | 🔴 Critical | SQL injection via string interpolation | 15 |
| 2 | 🔴 Critical | Hardcoded API secret | 13 |
| 3 | 🟡 Warning | No input validation on request body | 12 |
| 4 | 🟡 Warning | No try/catch around async operations | 12–22 |
| 5 | 🟡 Warning | Missing return after 409 response | 18 |
| 6 | 🔵 Suggestion | Remove console.log | 12 |

If it misses any, iterate on your instructions — this is the core skill of agent development.

## Step 5: Iterate on Your Instructions

Agent development is an **iterative** process. Here's a practical workflow:

```
┌──────────────────┐
│ Write/update      │
│ instructions      │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ Test with known   │
│ good + bad code   │
└────────┬─────────┘
         ▼
┌──────────────────┐    ┌──────────────┐
│ Review agent      │───►│ Refine rules │──┐
│ output            │    │ and examples │  │
└──────────────────┘    └──────────────┘  │
         ▲                                 │
         └─────────────────────────────────┘
```

### Common Iteration Patterns

| Problem | Fix |
|---------|-----|
| Agent misses an issue type | Add an explicit rule with an example |
| Agent flags too many false positives | Add "don't flag X when Y" exceptions |
| Agent output is vague | Add "be specific: reference exact line and suggest a fix" |
| Agent misunderstands project context | Add architecture notes to instructions |

## Best Practices for Agent Reliability

### 1. Be Specific About What You Want

```markdown
# ❌ Vague
Review this code for issues.

# ✅ Specific
Review this Express.js route handler. Check for:
- Missing zod validation on req.body
- Unhandled promise rejections
- Any use of db.$queryRawUnsafe (should use parameterized queries)
```

### 2. Provide Examples of Good Output

Add a "Example Review" section to your instructions showing the exact format you expect:

```markdown
## Example Review Output

🔴 **Critical — SQL Injection** (line 15)
`db.$queryRawUnsafe(query)` with string-interpolated user input.
**Fix:** Use parameterized query: `db.$queryRaw\`SELECT * FROM users WHERE email = ${email}\``
```

### 3. Set Explicit Boundaries

```markdown
## Out of Scope
- Do NOT suggest architectural changes
- Do NOT comment on formatting (Prettier handles that)
- Do NOT flag issues in test files unless they involve security
```

## Extension Challenge: Build a Documentation Agent

Apply what you've learned to a different domain. Create a documentation agent that:

1. Scans exported functions missing JSDoc comments
2. Generates documentation following your team's style
3. Validates that `@param` types match the TypeScript types
4. Flags stale documentation where the function signature changed

**Starter instructions:**

```markdown
# Documentation Agent Instructions

You are a technical documentation specialist.

## Rules
1. Every exported function must have a JSDoc comment
2. Include @param for each parameter with type and description
3. Include @returns with type and description
4. Include @throws if the function can throw
5. Include @example with a runnable code snippet
6. Match the voice and style of existing JSDoc in the codebase
```

Test it on a real module in your project, then iterate on the instructions until the output matches your team's expectations.

## 🎯 What You Learned

- How to write effective agent instructions in `.github/copilot-instructions.md`
- How to layer directory-level instructions for granular control
- How to connect external tools via MCP servers
- How to test and iterate on agent behavior
- Best practices for reliable, predictable agent output

## ➡️ Next Steps

Ready to build autonomous systems that run without human intervention? Continue to the advanced course:
- 🔴 [Autonomous Agent Pipelines and Self-Healing Systems](/Learn-GHCP/courses/agents/custom-agents-advanced/)
