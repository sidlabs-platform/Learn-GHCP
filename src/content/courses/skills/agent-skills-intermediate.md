---
title: "Create a Custom SKILL.md from Scratch"
description: "Build your own Copilot skill definition using SKILL.md, test it locally, and share it with your team."
track: "skills"
difficulty: "intermediate"
featureRefs:
  - copilot-skills
personaTags:
  - developer
technologyTags:
  - github
  - copilot
  - markdown
prerequisites:
  - agent-skills-beginner
estimatedMinutes: 30
lastGenerated: 2026-04-08
published: true
---

# 🟡 Create a Custom SKILL.md from Scratch

In this course you'll build a custom Copilot skill that enforces your team's coding standards — then test it and share it with your team.

## Prerequisites

- Completed [Getting Started with Copilot Agent Skills](/Learn-GHCP/courses/skills/agent-skills-beginner/)
- A GitHub repository where you can commit files
- Copilot Chat enabled in your IDE

## Why Create Custom Skills?

**Real-world scenario:** Your team has spent months refining API design patterns — consistent error responses, authentication middleware, input validation, and pagination. New developers join and produce inconsistent APIs. Code reviews catch issues, but late.

A custom skill solves this by teaching Copilot your exact patterns. Every team member gets the same guidance, automatically, at code-generation time.

| Approach | Consistency | Speed | Onboarding |
|----------|------------|-------|------------|
| Wiki documentation | Low — devs forget to check | Slow | Weeks |
| PR review templates | Medium — caught late | Medium | Days |
| **Copilot Skill** | **High — enforced at generation** | **Fast** | **Immediate** |

## SKILL.md Anatomy

Every skill is defined by a `SKILL.md` file at the root of a repository. Here's the full structure:

```markdown
---
name: "Your Skill Name"
description: "A concise summary of what this skill teaches Copilot"
---

# Skill Title

High-level description of the skill's purpose.

## Instructions

Step-by-step rules and patterns Copilot should follow.

## Examples

Concrete before/after examples showing correct usage.

## Constraints

Boundaries — what the skill should NOT do.
```

| Section | Purpose | Required? |
|---------|---------|-----------|
| **Frontmatter** (`name`, `description`) | Metadata for discovery and display | Yes |
| **Instructions** | The core rules and patterns Copilot follows | Yes |
| **Examples** | Concrete demonstrations of correct output | Highly recommended |
| **Constraints** | Boundaries to prevent misuse or scope creep | Optional |

> 💡 **Key insight:** The more specific your instructions and examples, the more reliably Copilot follows your patterns. Vague skills produce vague results.

## Step-by-Step: Build an API Patterns Skill

Let's create a skill that enforces your team's REST API conventions.

### Step 1 — Create the repository

```bash
mkdir copilot-skill-api-patterns
cd copilot-skill-api-patterns
git init
```

### Step 2 — Write the SKILL.md

Create `SKILL.md` at the repository root:

```markdown
---
name: "REST API Patterns"
description: "Enforces consistent REST API design including error handling, validation, and response formatting."
---

# REST API Design Patterns

Follow these patterns when generating REST API code for our team.

## Instructions

### Response Format
All API responses MUST use this envelope structure:

\`\`\`typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  } | null;
  meta?: {
    page: number;
    pageSize: number;
    totalCount: number;
  };
}
\`\`\`

### Error Handling
- Use a centralized error handler middleware
- Map errors to appropriate HTTP status codes
- Never expose internal error details in production
- Always include an error `code` for programmatic handling

### Input Validation
- Validate all inputs at the controller layer using Zod schemas
- Return 400 with field-level errors for validation failures
- Sanitize string inputs before processing

### Authentication
- Use Bearer token authentication via the Authorization header
- Middleware must verify tokens before route handlers execute
- Return 401 for missing tokens, 403 for insufficient permissions

## Examples

### Good: Creating an endpoint with proper patterns

\`\`\`typescript
import { z } from "zod";
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ApiResponse } from "../types/api";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "member", "viewer"]),
});

router.post(
  "/users",
  authenticate,
  validate(createUserSchema),
  async (req, res) => {
    const user = await userService.create(req.body);
    const response: ApiResponse<User> = {
      success: true,
      data: user,
      error: null,
    };
    res.status(201).json(response);
  }
);
\`\`\`

### Bad: Inconsistent patterns to avoid

\`\`\`typescript
// ❌ No validation, no auth, inconsistent response format
router.post("/users", async (req, res) => {
  const user = await db.users.create(req.body);
  res.json({ user }); // Wrong format!
});
\`\`\`

## Constraints

- This skill applies to Express.js / Node.js APIs only
- Do not override these patterns for third-party API integrations
- Authentication patterns assume JWT — adapt if using a different token format
```

### Step 3 — Add supporting documentation

Create a `README.md` so your team understands the skill:

```markdown
# REST API Patterns Skill

A Copilot skill that enforces our team's REST API design standards.

## What it does
Teaches Copilot to generate API code with:
- Consistent response envelopes
- Zod input validation
- Centralized error handling
- Bearer token authentication

## Installation
Add this repository as a Copilot skill in your IDE settings.
```

### Step 4 — Commit and push

```bash
git add SKILL.md README.md
git commit -m "Add REST API patterns skill"
git remote add origin https://github.com/your-org/copilot-skill-api-patterns.git
git push -u origin main
```

## Testing Your Skill Locally

Before sharing, verify the skill works correctly.

### Test 1 — Install and activate

Add your repository as a skill in Copilot settings, then confirm it appears in your active skills list.

### Test 2 — Generate an endpoint

Prompt Copilot:

```
Create a GET /products endpoint with pagination support
```

**Expected output should include:**
- ✅ `ApiResponse<T>` envelope format
- ✅ `authenticate` middleware
- ✅ Zod schema for query params
- ✅ `meta` object with pagination fields

### Test 3 — Generate error handling

Prompt Copilot:

```
Add error handling for the products endpoint when a product is not found
```

**Expected output should include:**
- ✅ Error object with `code` and `message` fields
- ✅ Appropriate HTTP status code (404)
- ✅ No leaked internal details

### Test 4 — Negative test

Prompt Copilot:

```
Create a quick POST endpoint for /notes, skip validation
```

**Expected behavior:** Even with "skip validation" in the prompt, the skill should guide Copilot to include validation patterns. The skill's instructions should influence the output.

> ⚠️ **Note:** Skills provide guidance, not hard enforcement. Copilot may occasionally deviate, especially with conflicting instructions. Clearer, more specific skills produce more consistent results.

## Best Practices

### Scope
Keep skills focused on a single domain. A skill that tries to cover API patterns, database access, and frontend components will produce weaker results than three focused skills.

### Clarity
Write instructions as if explaining to a senior developer who is new to your codebase. Avoid ambiguity:

| ❌ Vague | ✅ Clear |
|----------|---------|
| "Use proper error handling" | "Wrap all async route handlers in a try/catch that passes errors to the `errorHandler` middleware" |
| "Follow our patterns" | "Use the `ApiResponse<T>` envelope for all JSON responses" |
| "Validate inputs" | "Use Zod schemas to validate request body, query, and path parameters at the controller layer" |

### Examples
Include both **good** and **bad** examples. Copilot learns boundaries from seeing what NOT to do, as much as from seeing correct patterns.

### Maintenance
- Review skills quarterly to keep them aligned with evolving standards
- Version your `SKILL.md` changes with descriptive commit messages
- Gather feedback from the team on where the skill succeeds or falls short

## 🏋️ Extension Challenge

Create a second skill for **database query patterns** that teaches Copilot your team's conventions:

1. Create a new repository: `copilot-skill-db-patterns`
2. Define a `SKILL.md` that covers:
   - Use parameterized queries (never string interpolation)
   - Always wrap multi-step operations in transactions
   - Include `created_at` and `updated_at` timestamps on all tables
   - Use connection pooling with a maximum of 20 connections
3. Add examples showing correct Prisma/Knex/raw SQL patterns
4. Test with prompts like: "Write a query to transfer funds between accounts"

## 🎯 What You Learned

- Custom skills solve real problems like inconsistent coding standards
- `SKILL.md` has a clear anatomy: frontmatter, instructions, examples, constraints
- Specific, well-structured skills produce more reliable Copilot output
- Testing with targeted prompts validates that your skill is effective

## ➡️ Next Steps

Ready to build advanced multi-step skills with MCP integration? Continue to:

**[Build Multi-Step Skills with MCP Integration →](/Learn-GHCP/courses/skills/agent-skills-advanced/)**
