---
title: "Advanced Copilot Chat: Context, Participants, and Workflows"
description: "Master Copilot Chat participants (@workspace, @terminal, @vscode), context references, and multi-turn conversation strategies."
track: "technology"
difficulty: "intermediate"
featureRefs:
  - copilot-chat
  - inline-chat
  - agent-mode
personaTags:
  - developer
technologyTags:
  - vscode
  - copilot
  - chat
prerequisites:
  - copilot-chat-beginner
estimatedMinutes: 35
lastGenerated: 2026-04-08
published: true
---

# 🟡 Advanced Copilot Chat: Context, Participants, and Workflows

You've mastered the basics of Copilot Chat — now it's time to go deeper. This course covers Chat participants, advanced context references, multi-turn conversation strategies, and combining Chat with agent mode for powerful development workflows.

## Prerequisites

- Completed **Mastering Copilot Chat: Your AI Coding Companion** (beginner course)
- VS Code with Copilot Chat extension (v1.93+)
- A project with multiple files to practice workspace-scoped queries

## Chat Participants Deep Dive

Chat participants are specialized providers accessed with the `@` prefix. Each participant has domain-specific knowledge and capabilities.

### @workspace — Your Codebase Expert

`@workspace` indexes your entire project and can answer questions that span multiple files:

```
@workspace How is authentication implemented in this project?
```

Under the hood, `@workspace` uses VS Code's workspace index to search file names, symbols, and content across your project. It can find:

- Where functions are defined and used
- How modules depend on each other
- Configuration patterns across files

**Practical example — Trace a request through your app:**

```
@workspace Trace the flow of a POST /api/users request from
the route handler through middleware to the database layer.
```

Copilot analyzes route files, middleware, controllers, and database models to produce a step-by-step flow:

```
1. routes/users.ts → POST /api/users → calls UsersController.create()
2. middleware/auth.ts → verifyToken() validates JWT
3. middleware/validate.ts → validateBody(CreateUserSchema)
4. controllers/users.ts → UsersController.create() calls UserService.createUser()
5. services/users.ts → UserService.createUser() hashes password, calls UserRepo.insert()
6. repositories/users.ts → UserRepo.insert() executes SQL INSERT via Prisma
```

### @terminal — Your Shell Companion

`@terminal` can read your terminal's recent output and help you understand or fix command-line errors:

```
@terminal Explain the error in my terminal
```

**Practical example — Fixing a failed build:**

After running `npm run build` and getting a wall of TypeScript errors, ask:

```
@terminal What are the TypeScript errors and how do I fix them?
```

Copilot reads the terminal buffer, identifies the errors, and proposes fixes:

> *There are 3 TypeScript errors:*
> 1. *`src/api.ts:24` — Property `userId` doesn't exist on type `Request`. Add a custom type declaration or use `(req as any).userId`.*
> 2. *`src/db.ts:8` — Missing return type. Add `: Promise<User[]>` to the function signature.*
> 3. *`src/utils.ts:15` — Argument of type `string | undefined` is not assignable. Add a null check before passing the value.*

### @vscode — Your Editor Guide

`@vscode` knows about VS Code settings, keybindings, and features:

```
@vscode How do I enable word wrap for markdown files only?
```

Copilot responds with the exact settings JSON:

```json
{
  "[markdown]": {
    "editor.wordWrap": "on"
  }
}
```

**More examples:**

```
@vscode What's the shortcut to open the integrated terminal?
@vscode How do I configure auto-save with a 1-second delay?
@vscode Show me how to set up a custom task for running pytest
```

## Advanced Context References

Beyond the basics from the beginner course, here's how to combine context references for precision:

### #file — Pinpoint Specific Files

Reference one or more files by name:

```
Compare #file:src/auth/jwt.ts and #file:src/auth/session.ts.
Which approach is more secure for our use case?
```

### #selection — Reference Selected Code

Select code in the editor, then reference it in Chat:

```
Refactor #selection to use the Strategy pattern instead of the switch statement
```

### #codebase — Broader Context

`#codebase` is similar to `@workspace` but used as an inline context variable:

```
Based on #codebase, what naming conventions does this project use for database models?
```

### Combining References

You can combine multiple references in one prompt:

```
Using the interface in #file:src/types/user.ts, refactor #selection
to properly type the API response. Follow the patterns in #file:src/api/products.ts.
```

This gives Copilot three distinct pieces of context: the type definitions, the code to refactor, and an example to follow.

## Multi-Turn Conversation Strategies

The real power of Chat emerges in multi-turn conversations where you iteratively build up a solution.

### Strategy 1: Incremental Refinement

Start broad, then narrow down:

```
Turn 1: Design a caching layer for our REST API
Turn 2: Use Redis instead of in-memory cache
Turn 3: Add TTL support with configurable expiry per route
Turn 4: Add cache invalidation when a POST/PUT/DELETE happens
Turn 5: Write the TypeScript interfaces for this design
```

Each turn adds specificity. Copilot carries the full context forward.

### Strategy 2: Explore Then Implement

Use early turns to investigate, later turns to code:

```
Turn 1: @workspace What ORMs or database libraries does this project use?
Turn 2: @workspace Show me how queries are structured in the existing services
Turn 3: Write a new service method to fetch paginated orders using
        the same patterns, with cursor-based pagination
```

### Strategy 3: Review Then Improve

Generate code, then critique and improve it:

```
Turn 1: Write a rate limiter middleware for Express using a token bucket algorithm
Turn 2: What are the edge cases this doesn't handle?
Turn 3: Fix those edge cases and add proper TypeScript types
Turn 4: /tests
```

### Anti-Pattern: Context Overload

Avoid stuffing too much into a single prompt. Instead of one massive prompt, break it into a conversation:

```
❌ Bad: "Write a complete user authentication system with JWT tokens, refresh
    tokens, password hashing, email verification, rate limiting, and audit logging
    with full tests and documentation"

✅ Good: Start with the core JWT auth, then layer on features turn by turn
```

## Combining Chat with Agent Mode

Agent mode (Copilot Edits) can make multi-file changes autonomously. Pair it with Chat for a powerful workflow:

### Workflow: Plan in Chat, Execute in Agent Mode

1. **Plan in Chat:**
   ```
   @workspace I need to add a notification system. Which files should
   I modify and what new files should I create?
   ```

2. **Review the plan** — Chat suggests modifying 3 files and creating 2 new ones

3. **Switch to Agent Mode** (`Ctrl+Shift+I`) and prompt:
   ```
   Implement the notification system as planned in our chat conversation.
   Create NotificationService in src/services/notifications.ts,
   add the notification model in src/models/notification.ts,
   and register the routes in src/routes/notifications.ts.
   ```

4. **Agent Mode** makes all the file edits. Review the diff and accept.

### Workflow: Debug in Chat, Fix with Inline

1. **Paste an error** in Chat:
   ```
   I'm getting this error when running tests:
   TypeError: Cannot read property 'map' of undefined
   at UserList (src/components/UserList.tsx:15)
   ```

2. **Chat diagnoses** the issue — the `users` prop might be `undefined` on first render

3. **Open the file**, place cursor on line 15, press `Ctrl+I`:
   ```
   Add a guard clause to handle undefined users prop with a loading state
   ```

4. **Inline Chat** makes the precise fix right where you need it

## Custom Instructions via Settings

You can configure Copilot Chat's behavior with custom instructions that apply to all conversations.

### Project-Level Instructions

Create a `.github/copilot-instructions.md` file in your repo:

```markdown
## Project Context
This is a Node.js REST API using Express, TypeScript, and Prisma ORM.
We use PostgreSQL in production and SQLite for testing.

## Code Style
- Use functional programming patterns; avoid classes except for Prisma models
- All functions must have explicit TypeScript return types
- Use `Result<T, E>` pattern for error handling (no throwing exceptions)
- Prefer named exports over default exports

## Testing
- Use Vitest for unit tests, Supertest for integration tests
- Follow AAA pattern (Arrange, Act, Assert) with clear section comments
- Mock external services; never call real APIs in tests
```

When this file exists, Copilot automatically incorporates these instructions into every Chat response, ensuring consistent code style and patterns.

### User-Level Instructions

In VS Code settings, add personal instructions:

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    { "text": "Always use async/await instead of .then() chains" },
    { "text": "Include error handling in every function that does I/O" },
    { "text": "Add TypeScript strict mode compatible types" }
  ]
}
```

## Workspace Indexing

For `@workspace` to work effectively, VS Code builds an index of your project. Here's how to optimize it:

### Check Index Status

Open the Command Palette (`Ctrl+Shift+P`) and run:
```
GitHub Copilot: Workspace Index Status
```

### Exclude Irrelevant Files

Add entries to your `.gitignore` or configure VS Code settings to exclude large generated directories:

```json
{
  "github.copilot.chat.search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "**/.next": true
  }
}
```

This keeps the index focused on your source code and speeds up `@workspace` queries.

## Hands-On Exercise: Multi-Step Feature Development

Build a complete feature using the participant and multi-turn strategies from this course.

### Scenario: Add Pagination to an API

You have an Express + TypeScript API. Add cursor-based pagination to the `/api/products` endpoint.

**Step 1 — Investigate the codebase:**

```
@workspace How is the /api/products endpoint currently implemented?
Show me the route, controller, and service files.
```

**Step 2 — Understand the data layer:**

```
@workspace What database library is used and how are queries
structured in existing services? Show an example.
```

**Step 3 — Design the approach:**

```
Design cursor-based pagination for the products endpoint using the
patterns from #file:src/services/productService.ts. The cursor should
be based on the product ID. Support a configurable page size with a
default of 20 and a max of 100.
```

**Step 4 — Generate the implementation:**

```
Write the updated productService.getPaginated() method, the route
handler changes, and the TypeScript types for the paginated response.
```

**Step 5 — Review and refine:**

```
What edge cases does this pagination implementation miss?
```

**Step 6 — Generate tests:**

```
/tests for the pagination logic including edge cases:
empty results, first page, last page, invalid cursor, page size limits
```

**Step 7 — Fix terminal errors:**

Run the tests, and if they fail:

```
@terminal The pagination tests are failing. What's wrong?
```

### Expected Result

After this exercise you should have:
- A working cursor-based pagination implementation across 3+ files
- Comprehensive tests covering edge cases
- Experience with `@workspace`, `@terminal`, multi-turn strategies, and context references

## Participants Reference

| Participant | Prefix | Use Case |
|-------------|--------|----------|
| **Workspace** | `@workspace` | Codebase-wide questions, finding patterns, tracing flows |
| **Terminal** | `@terminal` | Understanding command output, fixing build/test errors |
| **VS Code** | `@vscode` | Editor settings, keybindings, extension configuration |

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Chat participant** | A specialized provider in Chat accessed with `@` that has domain-specific knowledge |
| **Context reference** | A `#` prefixed token pointing to a specific file, selection, or codebase scope |
| **Multi-turn conversation** | A series of related prompts in a single Chat session that build on prior context |
| **Agent mode** | Copilot Edits — an autonomous mode that makes multi-file changes based on a prompt |
| **Workspace index** | VS Code's searchable index of your project's files, symbols, and content |
| **Custom instructions** | Configuration files or settings that shape Copilot's responses for your project |

## ➡️ Next Steps

Ready to deploy Chat patterns across your team and build custom participants? Continue to the advanced course:
- 🔴 [Copilot Chat at Scale: Team Patterns and Custom Extensions](/Learn-GHCP/courses/technology/copilot-chat-advanced/)
