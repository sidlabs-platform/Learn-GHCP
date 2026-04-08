---
title: "Context Optimization and Instruction Files"
description: "Master Copilot's context window — use instruction files, file references, and workspace context to dramatically improve output quality."
track: "technology"
difficulty: "intermediate"
featureRefs: [copilot-chat, copilot-skills, code-completions]
personaTags: [developer]
technologyTags: [copilot, prompting, configuration]
prerequisites: [prompt-engineering-beginner]
estimatedMinutes: 35
lastGenerated: 2026-04-08
published: true
---

# 🟡 Context Optimization and Instruction Files

Copilot's output is only as good as the context it receives. In this course, you'll learn how to control and optimize that context — from instruction files that set project-wide conventions to fine-grained file references that give Copilot exactly the information it needs.

## Prerequisites

- Completed [Prompt Engineering Basics for Copilot](/Learn-GHCP/courses/technology/prompt-engineering-beginner/)
- A project with multiple files (any language)
- VS Code with GitHub Copilot Chat extension

## How Copilot's Context Window Works

Copilot doesn't see your entire codebase at once. It works with a **context window** — a limited amount of text that includes the current file, open tabs, and referenced files.

```
┌─────────────────────────────────────────────────────────┐
│                  Copilot Context Window                   │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Current     │  │  Open Tabs   │  │  Instruction   │  │
│  │  File        │  │  (nearby)    │  │  Files         │  │
│  │  ★ Highest   │  │  ● Medium    │  │  ● Always      │  │
│  │    Priority  │  │    Priority  │  │    Included    │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  #file      │  │  #codebase   │  │  Chat          │  │
│  │  References  │  │  Search      │  │  History       │  │
│  │  ● Explicit  │  │  ● On-demand │  │  ● Recent      │  │
│  │    Include   │  │    Search    │  │    Turns       │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Context Priority Order

| Priority | Source | How It Works |
|----------|--------|-------------|
| 1 (Highest) | Current file | Always included — the file your cursor is in |
| 2 | Instruction files | `.github/copilot-instructions.md` is automatically included |
| 3 | Explicit references | Files you reference with `#file` in Chat |
| 4 | Open editor tabs | Copilot considers recently opened files |
| 5 | Codebase search | `#codebase` triggers semantic search across your project |
| 6 | Chat history | Previous messages in the current conversation |

## Instruction Files: `.github/copilot-instructions.md`

The most powerful way to shape Copilot's behavior is with an instruction file. This markdown file is **automatically included in every Copilot interaction** for your project.

### Step 1 — Create the File

```bash
mkdir -p .github
touch .github/copilot-instructions.md
```

### Step 2 — Write Your Instructions

```markdown
<!-- .github/copilot-instructions.md -->

## Project Overview
This is a TypeScript REST API using Express.js with PostgreSQL.
The project follows a layered architecture: routes → controllers → services → repositories.

## Code Conventions
- Use `async/await` for all asynchronous operations (never raw Promises or callbacks)
- Prefer named exports over default exports
- Use Zod schemas for all request validation
- Errors must use the custom `AppError` class from `src/errors/AppError.ts`
- All database queries go through the repository layer — never call `db.query()` directly in services

## Testing Conventions
- Use Jest with TypeScript
- Test files live next to source files: `userService.test.ts` alongside `userService.ts`
- Use factories from `src/test/factories/` for test data
- Mock the repository layer in service tests
- Mock the service layer in controller tests

## Naming Conventions
- Files: camelCase (`userService.ts`)
- Classes: PascalCase (`UserService`)
- Interfaces: PascalCase with `I` prefix for contracts (`IUserRepository`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- Route handlers: `verbNoun` pattern (`getUser`, `createOrder`, `deleteSession`)
```

### What This Achieves

Every time you ask Copilot Chat a question or accept a ghost text suggestion, it knows:
- Your project structure and architecture
- Your preferred coding patterns
- Your naming conventions
- Your testing approach

> 💡 **Tip:** Keep instruction files under 500 lines. Too much text can dilute the most important conventions. Prioritize the rules that Copilot gets wrong most often.

## Per-Language Instruction Files

For polyglot projects, use language-specific instruction files. VS Code supports additional files via `github.copilot.chat.codeGeneration.instructions` in `.vscode/settings.json`:

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    { "file": ".github/copilot-instructions.md" },
    { "file": ".github/copilot-instructions-python.md" },
    { "file": ".github/copilot-instructions-typescript.md" }
  ]
}
```

### Python-Specific Instructions

```markdown
<!-- .github/copilot-instructions-python.md -->

## Python Conventions
- Use Python 3.12+ features (match statements, type unions with `|`)
- Use `pydantic` for data validation, not dataclasses
- Follow Google-style docstrings
- Use `ruff` for linting — code must pass `ruff check .`
- Prefer `pathlib.Path` over `os.path`
- Use `httpx` for HTTP requests (not `requests`)
- Async functions should use `asyncio` patterns with `async for` and `async with`
```

### TypeScript-Specific Instructions

```markdown
<!-- .github/copilot-instructions-typescript.md -->

## TypeScript Conventions
- Target ES2022 with strict mode enabled
- Use `type` for object shapes, `interface` for contracts implemented by classes
- Prefer `unknown` over `any` — narrow types with type guards
- Use barrel exports (`index.ts`) for public module APIs
- Enum alternatives: use `as const` objects with a type union
- Error handling: wrap external calls in try/catch with typed errors
```

## File References in Copilot Chat

Use `#file` to explicitly include specific files in your Chat context. This is critical when Copilot needs to understand types, schemas, or APIs defined elsewhere.

### Syntax

```
#file:src/types/user.ts How should I validate user input for the registration endpoint?
```

### When to Use `#file`

| Scenario | Reference |
|----------|-----------|
| Generating code that uses a shared type | `#file:src/types/index.ts` |
| Writing a service that calls a repository | `#file:src/repositories/userRepo.ts` |
| Creating a controller that uses middleware | `#file:src/middleware/auth.ts` |
| Writing tests for a specific module | `#file:src/services/orderService.ts` |

### Multi-File References

You can reference multiple files in a single prompt:

```
#file:src/types/order.ts #file:src/repositories/orderRepo.ts
Create an OrderService class with methods: createOrder, getOrderById, and listOrdersByUser.
Follow the same pattern used in #file:src/services/userService.ts
```

This gives Copilot three files of context plus the instruction file — enough to generate a complete, consistent service implementation.

## Codebase-Wide Context with `#codebase`

The `#codebase` reference triggers a semantic search across your entire project. Use it when you don't know which specific file to reference:

```
#codebase How is authentication implemented in this project?
```

Copilot searches your project files and responds with relevant code and explanations.

### When `#codebase` Shines

- Understanding unfamiliar codebases: "How does error handling work here?"
- Finding patterns: "Show me how other services implement pagination"
- Architecture questions: "What's the data flow from API request to database?"

### When to Prefer `#file` Over `#codebase`

- When you know the exact file — `#file` is faster and more precise
- When you need the full contents of a file, not a search snippet
- When working with small, focused changes

## File-Level Prompt Comments

For files where you always want Copilot to behave a certain way, add a prompt comment at the top:

```typescript
// @copilot: This file defines the public API surface. All functions must:
// 1. Have JSDoc with @param and @returns
// 2. Validate inputs with Zod before processing
// 3. Wrap errors in AppError with appropriate HTTP status codes
// 4. Be exported as named exports

import { z } from 'zod';
import { AppError } from '../errors/AppError';
```

This comment stays with the file and guides all future Copilot suggestions in it.

## Prompt Chaining Strategies

Complex tasks require breaking prompts into a sequence of steps. Each step builds on the previous one.

### Strategy 1: Define → Implement → Test

```
Step 1: "Define the TypeScript interfaces for a notification system with
         channels (email, SMS, push), templates, and delivery status"

Step 2: "Now implement the NotificationService class using the interfaces
         we just defined. Use the strategy pattern for channel dispatch."

Step 3: "Write comprehensive tests for NotificationService. Mock each
         channel and test the dispatch logic, template rendering, and
         error handling."
```

### Strategy 2: Scaffold → Detail → Refine

```
Step 1: "Create a skeleton Express router for /api/products with GET, POST,
         PUT, DELETE endpoints. Just the route definitions with placeholder handlers."

Step 2: "Implement the GET /api/products handler with pagination, filtering
         by category, and sorting by price or name."

Step 3: "Add input validation using Zod for the POST /api/products endpoint.
         The product must have name (3-100 chars), price (positive number),
         and category (one of 'electronics', 'clothing', 'food')."
```

### Strategy 3: Understand → Modify → Verify

```
Step 1: "Explain what #file:src/legacy/authMiddleware.js does, step by step"

Step 2: "Refactor this to TypeScript with proper types, replace callbacks with
         async/await, and add Zod validation for the JWT payload"

Step 3: "What edge cases should I test for the refactored auth middleware?"
```

## Measuring Prompt Effectiveness

Track how well your prompts perform using this simple framework:

### The 3A Score

Rate each Copilot suggestion on three axes:

| Metric | Score | Meaning |
|--------|-------|---------|
| **Accuracy** | 1–5 | Does the generated code do what you asked? |
| **Adherence** | 1–5 | Does it follow your project's conventions? |
| **Autonomy** | 1–5 | How much did you need to edit the output? |

**Target:** Average 4+ across all three metrics. If you're consistently below 3 on any metric, your prompts or instruction files need improvement.

### Improving Low Scores

| Low Score | Action |
|-----------|--------|
| Low Accuracy | Add more specific comments and examples to your prompts |
| Low Adherence | Update `.github/copilot-instructions.md` with the conventions being violated |
| Low Autonomy | Provide more context via `#file` references or open related tabs |

## Hands-On Exercise: Optimize Your Project Context

### Exercise 1: Create an Instruction File

1. Create `.github/copilot-instructions.md` in your project
2. Include sections for: Project Overview, Code Conventions, Testing Standards, and Naming Conventions
3. Ask Copilot Chat: "Generate a utility function for formatting currency" — before and after adding the instruction file
4. Compare the outputs — the post-instruction output should match your project style

### Exercise 2: Practice File References

1. Find a complex type definition in your project
2. Open a new file and ask Copilot Chat:
   - Without reference: "Create a service that manages [your domain concept]"
   - With reference: "#file:src/types/yourType.ts Create a service that manages [your domain concept]"
3. Compare how much manual editing each output requires

### Exercise 3: Prompt Chain

Build a complete feature using a 3-step prompt chain:

1. **Define:** "Create TypeScript interfaces for a task management system with tasks, labels, and assignments"
2. **Implement:** "#file:[your interfaces file] Implement a TaskService with CRUD operations and label filtering"
3. **Test:** "#file:[your service file] Write Jest tests covering happy paths, edge cases, and error handling"

### Exercise 4: Measure and Improve

1. Ask Copilot to generate 5 different functions in your project
2. Score each output using the 3A framework (Accuracy, Adherence, Autonomy)
3. For any score below 3, identify what context was missing and update your instruction file

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Instruction file doesn't seem to take effect | Verify the file is at `.github/copilot-instructions.md` (exact path); restart VS Code |
| `#file` reference shows "File not found" | Use the autocomplete dropdown when typing `#file:` — it searches your workspace |
| `#codebase` returns irrelevant results | Rephrase with more specific terms; combine with `#file` for critical context |
| Copilot ignores some conventions from instructions | Move the most important rules to the top of the instruction file |
| Multi-file references make responses slow | Limit to 3–4 file references per prompt; use `#codebase` for broader searches |

## Glossary

| Term | Definition |
|------|-----------|
| **Context Window** | The total amount of text Copilot considers when generating a suggestion |
| **Instruction File** | A markdown file at `.github/copilot-instructions.md` automatically included in Copilot's context |
| **File Reference** | Using `#file:path` in Chat to explicitly include a file's contents in context |
| **Codebase Search** | Using `#codebase` to trigger a semantic search across your entire project |
| **Prompt Chaining** | Breaking a complex task into sequential prompts where each builds on the previous |
| **3A Score** | A framework for measuring prompt quality: Accuracy, Adherence, Autonomy |
| **Barrel Export** | An `index.ts` file that re-exports symbols from a directory for cleaner imports |

## Next Steps

- 🔴 Continue to [Organization-Wide Prompt Strategies and Copilot Customization](/Learn-GHCP/courses/technology/prompt-engineering-advanced/) to scale your prompting practices across teams
- 🟡 Try [Advanced Test Strategies with Copilot](/Learn-GHCP/courses/technology/ai-testing-intermediate/) to apply context optimization to test generation
