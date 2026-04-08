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

In this course, you'll use Copilot CLI's plan mode to tackle a real-world coding task: building a REST API endpoint from scratch using a structured, multi-step approach.

## Why Plan Mode?

When you're working on a complex task, throwing a single prompt at an AI often produces incomplete or unfocused results. **Plan mode** lets you:

- Break a large task into discrete steps
- Review and adjust the plan before execution
- Maintain context across multiple steps
- Get more reliable, structured output

## Scenario: Build a User Authentication Endpoint

You've been asked to add a `/login` endpoint to an Express.js API. Let's use plan mode to approach this methodically.

## Step 1: Enter Plan Mode

```bash
ghcp --plan
```

Or from within an interactive session, type:

```
/plan Add a POST /login endpoint with JWT authentication to an Express.js app
```

Copilot will generate a multi-step plan like:

```
Plan: Add POST /login with JWT auth
  1. Install dependencies (express, jsonwebtoken, bcrypt)
  2. Create user model with password hashing
  3. Create login route handler
  4. Add JWT token generation
  5. Add middleware for token verification
  6. Write tests
```

## Step 2: Review and Adjust

You can modify the plan before execution:

```
/plan adjust - Add input validation as step 2.5
```

## Step 3: Execute Step by Step

Work through each step with full context:

```
/plan execute 1
```

Copilot generates the code for step 1, knowing the full plan context.

## Real-World Patterns

### When to Use Plan Mode

| Situation | Plan Mode? | Why |
|-----------|-----------|-----|
| Quick one-liner fix | ❌ | Overhead not worth it |
| Multi-file feature | ✅ | Keeps context organized |
| Refactoring across modules | ✅ | Structured approach prevents mistakes |
| Learning a new concept | ❌ | Interactive mode is more exploratory |

## Extension Challenge

Try using plan mode for one of these scenarios:
1. Add rate limiting to an existing API
2. Refactor a monolithic function into a service layer
3. Set up a CI/CD pipeline configuration

## ➡️ Next Steps

- 🔴 [Design a Custom CLI Plugin with MCP Integration](/Learn-GHCP/courses/copilot-cli/copilot-cli-advanced/)
