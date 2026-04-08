---
title: "Build a Multi-Step Workflow with Plan Mode"
description: "Use Copilot CLI's plan mode to break down complex tasks, manage context, and build a real feature step by step."
track: "copilot-cli"
difficulty: "intermediate"
featureRefs:
  - copilot-cli
  - plan-mode
personaTags:
  - developer
technologyTags:
  - terminal
  - cli
  - nodejs
prerequisites:
  - copilot-cli-beginner
estimatedMinutes: 30
lastGenerated: 2026-04-08
published: true
---

# 🟡 Build a Multi-Step Workflow with Plan Mode

In this course you'll use Copilot CLI's plan mode to tackle a real-world coding task: building a complete REST API feature from scratch using a structured, multi-step approach. Along the way you'll master session management, context optimization, model switching, multi-file editing, and git workflows — all from the terminal.

## Prerequisites

- Completed the beginner course: [Your First Copilot CLI Session](/Learn-GHCP/courses/copilot-cli/copilot-cli-beginner/)
- **Node.js 20+** and **npm** installed
- **Git** installed and configured
- Copilot CLI installed and authenticated (`ghcp` launches successfully)
- Basic familiarity with Express.js (or willingness to follow along)

### Verify Your Setup

```bash
ghcp --version && node --version && git --version
```

All three commands should print version numbers. If any fail, revisit the beginner course.

## The Scenario

Your team maintains a small Express.js API. You've been assigned a ticket:

> **TICKET-42:** Add a `POST /api/users` endpoint that creates a new user with input validation, stores the record, and returns the created user with a `201` status.

This is a multi-file task involving a route, a model, validation logic, and tests. Instead of writing one giant prompt and hoping for the best, you'll use **plan mode** to break it into manageable steps.

## Part 1 — Plan Mode Deep Dive

### What Is Plan Mode?

When you throw a complex request at an AI in a single prompt, the output is often incomplete, unfocused, or skips edge cases. **Plan mode** flips the workflow:

1. Copilot generates a **step-by-step plan** from your description.
2. You **review and adjust** the plan before any code is written.
3. You **execute steps one at a time**, maintaining full context throughout.

This mirrors how experienced developers work — think first, then build.

### Entering Plan Mode

From an interactive session, describe your task:

```
Create a plan: Add a POST /api/users endpoint to this Express.js app. It should
validate the request body (name required, email must be valid), store the user in
an in-memory array, and return 201 with the created user. Include unit tests.
```

Copilot analyzes your request and generates a structured plan. The output should include numbered steps like:

```
Plan: Add POST /api/users endpoint
  1. Create the User model with validation logic
  2. Create the POST /api/users route handler
  3. Wire the route into the Express app
  4. Add input validation middleware
  5. Write unit tests for the model
  6. Write integration tests for the endpoint
```

### Reviewing the Plan

Before executing, read each step carefully. Ask yourself:

- Are there missing steps? (e.g., error handling, edge cases)
- Is the order logical? (e.g., model before routes)
- Does any step do too much?

If you spot a gap, tell Copilot:

```
Add a step between 2 and 3: Create error-handling middleware that returns
structured JSON error responses with appropriate HTTP status codes.
```

Copilot revises the plan with your addition.

### Adjusting Individual Steps

You can also refine specific steps:

```
For step 1, use a class-based model with static methods instead of plain functions.
```

> 💡 **Tip:** Spending a minute refining the plan saves much more time than fixing generated code later.

### Executing Steps

Work through the plan one step at a time:

```
Execute step 1
```

Copilot generates the code for step 1 with full awareness of the overall plan. It may create files, suggest terminal commands, or ask for approval before writing.

After each step, **verify** the output:

```bash
node -e "const User = require('./src/models/user'); console.log(typeof User)"
```

Then move to the next step:

```
Execute step 2
```

Each subsequent step has context from all previous steps — Copilot knows what code already exists.

### When to Use Plan Mode

| Situation | Plan Mode? | Why |
|-----------|-----------|-----|
| Quick one-liner fix | ❌ | Overhead isn't worth it |
| Multi-file feature | ✅ | Keeps context organized across files |
| Refactoring across modules | ✅ | Structured approach prevents missed changes |
| Learning a new concept | ❌ | Interactive mode is more exploratory |
| Debugging a specific error | ❌ | Direct questions are faster |
| Building a feature with tests | ✅ | Plan ensures tests aren't an afterthought |

## Part 2 — Session Management

### Saving and Resuming Sessions

Long workflows span multiple terminal sessions. Copilot CLI can persist your conversation so you don't lose context.

To save your current session:

```
/session save
```

Copilot saves the conversation state. Next time you launch `ghcp`, you can resume:

```
/resume
```

This restores the full conversation including any plans, generated code, and context you've built up.

### When to Start Fresh vs. Resume

| Scenario | Action | Why |
|----------|--------|-----|
| Continuing a multi-step feature | `/resume` | Preserves plan context |
| Switching to an unrelated task | `/clear` | Prevents context pollution |
| Context window is full | `/compact` then continue | Frees space without losing key context |
| Previous session went off track | Start new `ghcp` session | Clean slate |

> 💡 **Tip:** If you're unsure whether to resume or start fresh, use `/compact` to condense the old session — this keeps the essential context while freeing up space.

## Part 3 — Context Optimization

Copilot's responses are only as good as the context it has. Providing the right files — and not overloading with irrelevant ones — is a core skill.

### Providing Targeted Context

When asking Copilot to work on a specific feature, point it at the relevant files:

```
@src/routes/users.ts @src/models/user.ts — Add email uniqueness validation
to the POST /api/users endpoint.
```

This focuses Copilot on exactly the files it needs to modify.

### Reading an Entire Directory

For broader tasks, reference a directory:

```
@src/middleware/ — Summarize what each middleware does and identify any
that could apply to our new users endpoint.
```

### Context Window Strategies

Every model has a limited context window. When working on large projects:

```
┌──────────────────────────────────────────────────────┐
│                  Context Window                       │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ System    │  │ Your     │  │ Referenced Files  │   │
│  │ Prompt    │  │ Messages │  │ (@file contents)  │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
│  ← fills from left to right; oldest messages drop →  │
└──────────────────────────────────────────────────────┘
```

**Best practices:**

1. **Reference only the files Copilot needs** — don't `@` your entire `src/` directory
2. **Use `/compact` proactively** — condense the conversation before it hits the limit
3. **Start new sessions for new tasks** — don't carry unrelated context forward
4. **Put the most important context last** — recent messages get priority

### Verifying What Copilot Sees

If you're unsure what context Copilot has, ask:

```
What files do you currently have context for?
```

## Part 4 — Model Switching

Different AI models have different strengths. Copilot CLI lets you switch models mid-session.

### Checking the Current Model

```
/model
```

### Switching Models

```
/model claude-sonnet
```

### When to Switch

| Task | Recommended Model | Why |
|------|-------------------|-----|
| Quick code generation | Fast model (e.g., GPT-4o-mini) | Speed over depth |
| Complex architecture decisions | Reasoning model (e.g., Claude Sonnet, o1) | Better at nuanced trade-offs |
| Detailed code review | Large-context model | Can hold more files at once |
| Debugging with stack traces | Any model | Most handle this well |

> 💡 **Tip:** You can switch models in the middle of a plan execution. Start with a fast model for simple steps and switch to a stronger model for complex ones.

### Comparing Model Outputs

When you're unsure which model handles a task better, try this workflow:

1. Ask the question with the current model
2. Note the response
3. Run `/model <other-model>` and ask the same question
4. Compare quality, completeness, and accuracy

## Part 5 — Multi-File Editing Workflows

Real features span multiple files. Here's how to guide Copilot through multi-file changes effectively.

### Describing Multi-File Changes

Be explicit about which files need changes and what each change involves:

```
I need to add a "role" field to our user system. This requires changes to:
1. @src/models/user.ts — Add a "role" property with type "admin" | "user"
2. @src/routes/users.ts — Accept "role" in the POST body
3. @src/middleware/auth.ts — Check the role for admin-only routes
4. @tests/users.test.ts — Update tests to include role scenarios

Make all four changes.
```

### Verifying Multi-File Edits

After Copilot makes changes across files, verify them:

```bash
git diff --stat
```

This shows which files were modified and how many lines changed. Then review the actual changes:

```bash
git diff
```

If something looks wrong, tell Copilot:

```
The changes to auth.ts don't look right — the role check should happen
before the route handler, not inside it. Fix the middleware.
```

## Part 6 — Git Workflows from the CLI

Copilot CLI integrates naturally with git operations.

### Generating Commit Messages

After making changes, ask Copilot to help with the commit:

```
Look at my staged changes and write a conventional commit message.
```

Copilot reads `git diff --cached` and generates a message like:

```
feat(users): add POST /api/users endpoint with validation

- Create User model with name and email validation
- Add route handler with 201 response
- Wire error-handling middleware for structured errors
- Add unit and integration tests
```

### Reviewing Diffs

Before committing, use Copilot to review:

```
Review my uncommitted changes and flag any issues.
```

Copilot examines the diff and points out potential problems — missing error handling, unused imports, inconsistent naming, etc.

### Generating PR Descriptions

When you're ready to push:

```
Generate a pull request description for the changes on this branch compared
to main. Include a summary, list of changes, and testing notes.
```

## Part 7 — Comparing Interaction Modes

Copilot CLI offers several interaction modes. Understanding when to use each is key to being productive.

| Mode | How to Enter | Best For | Context Handling |
|------|-------------|----------|-----------------|
| **Interactive** | `ghcp` (default) | Exploration, Q&A, quick edits | Conversational; builds over time |
| **Plan Mode** | Describe a task in interactive mode | Multi-step features, refactoring | Structured; step-by-step |
| **Autopilot** | `ghcp` with agent-style prompt | End-to-end automation | Autonomous; minimal intervention |

### Plan Mode vs. Interactive

- **Plan mode** is like giving a contractor blueprints before building.
- **Interactive mode** is like pair-programming with a colleague.

Use plan mode when you know what you want; use interactive when you're exploring or learning.

### Plan Mode vs. Autopilot

- **Plan mode** gives you control at each step — you review and approve.
- **Autopilot** lets Copilot execute autonomously — faster but less control.

> ⚠️ **Caution:** Autopilot is covered in the advanced course. It's powerful but requires trust in the AI's decisions.

## Extension Challenges

Practice your new skills with these real-world scenarios:

### Challenge 1 — Add Rate Limiting

Use plan mode to add rate limiting to an Express.js API:
- Limit each IP to 100 requests per 15-minute window
- Return `429 Too Many Requests` with a `Retry-After` header
- Add tests that verify the limit is enforced

### Challenge 2 — Refactor to a Service Layer

Take a monolithic route handler that does everything (validation, business logic, database calls) and use plan mode to refactor it into:
- A validation layer
- A service layer with business logic
- A thin route handler that orchestrates the other layers
- Updated tests for each layer

### Challenge 3 — Database Migration

Use plan mode to migrate from an in-memory data store to SQLite:
- Install and configure `better-sqlite3`
- Create migration scripts for the user table
- Update the model layer to use SQL queries
- Ensure all existing tests still pass

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Plan steps seem out of order | Initial description was ambiguous | Refine the task description with explicit ordering |
| Copilot loses context mid-plan | Context window full | Run `/compact` and re-state the current step |
| Generated code doesn't match the plan | Step was too broad | Break the step into smaller sub-steps |
| `/resume` doesn't restore the plan | Session expired or cleared | Start a new plan — describe the remaining work |
| Multi-file edit misses a file | File wasn't referenced in the prompt | Explicitly `@mention` all relevant files |

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Plan mode** | A structured workflow where Copilot generates a step-by-step plan before writing code |
| **Session** | A persistent conversation with Copilot CLI that can be saved and resumed |
| **Context window** | The maximum amount of text (tokens) the AI model can consider at once |
| **Context optimization** | The practice of providing relevant files and information without overloading the model |
| **Model switching** | Changing the AI model mid-session to match task requirements |
| **Conventional commit** | A commit message format (`type(scope): description`) that standardizes version history |
| **Multi-file edit** | A single Copilot action that modifies code across multiple files |
| **Autopilot** | An autonomous mode where Copilot executes without step-by-step approval |
| **`/compact`** | Slash command that condenses the conversation to free context window space |
| **`/resume`** | Slash command that restores a previously saved session |

## 🎯 What You Learned

- How to use plan mode to break complex tasks into executable steps
- How to review, adjust, and execute plans methodically
- Session management: saving, resuming, and knowing when to start fresh
- Context optimization: referencing the right files without overloading
- Model switching: choosing the right model for each task type
- Multi-file editing workflows with verification
- Git workflows: commit messages, diff review, and PR descriptions
- The differences between interactive, plan, and autopilot modes

## ➡️ Next Steps

- 🔴 [Design a CLI Automation Pipeline](/Learn-GHCP/courses/copilot-cli/copilot-cli-advanced/)
