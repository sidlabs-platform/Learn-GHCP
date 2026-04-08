---
title: "Custom Code Review Rules and Team Standards"
description: "Configure Copilot code review with custom rules, coding standards, and team-specific patterns for consistent reviews."
track: "technology"
difficulty: "intermediate"
featureRefs:
  - copilot-code-review
  - copilot-agents
personaTags:
  - developer
  - tech-lead
technologyTags:
  - github
  - code-review
  - configuration
prerequisites:
  - code-review-beginner
estimatedMinutes: 35
lastGenerated: 2026-04-08
published: true
---

# 🟡 Custom Code Review Rules and Team Standards

Out-of-the-box Copilot Code Review catches common issues, but every team has unique standards. In this course you'll learn how to configure Copilot with **custom review instructions**, enforce coding standards, focus reviews on security and performance, and integrate Copilot into your team's existing workflow.

## Prerequisites

- Completed the [Copilot Code Review Beginner course](/Learn-GHCP/courses/technology/code-review-beginner/)
- A repository where you have admin or maintainer access
- Familiarity with your team's coding standards (style guides, naming conventions, etc.)

## The Scenario

Your team enforces specific standards that generic linters can't fully cover:

- All API endpoints must validate request bodies with a schema
- Database queries must use parameterized statements — no string interpolation
- Error responses must follow your team's standard envelope format
- React components must use named exports, never default exports

Copilot Code Review can enforce all of these — if you give it the right instructions.

## Custom Review Guidelines via Instructions

GitHub Copilot supports **custom instructions** that guide how it reviews your code. These instructions live in your repository and apply to every Copilot review.

### Setting Up Review Instructions

Create a file at `.github/copilot-review-instructions.md` in your repository:

```markdown
# Code Review Instructions

## API Endpoints
- Every Express/Fastify route handler MUST validate the request body
  using a Zod or Joi schema before processing.
- If validation fails, return a 400 response with the standard error
  envelope: `{ error: { code: string, message: string, details?: any } }`.

## Database Access
- All SQL queries MUST use parameterized queries ($1, $2 placeholders).
- NEVER use string interpolation or concatenation to build SQL.
- Flag any use of template literals in SQL query strings.

## Error Handling
- All catch blocks must log the error before re-throwing or returning.
- Never swallow errors silently (empty catch blocks).
- HTTP error responses must use the standard envelope format.

## React Components
- Use named exports only. Flag any `export default` in component files.
- Props interfaces must be explicitly defined (no inline types).
- Event handlers must be prefixed with `handle` (e.g., `handleClick`).
```

> 💡 **Tip:** Write instructions in clear, imperative language. Copilot interprets them as review criteria — the more specific you are, the more consistent the reviews.

### How Instructions Affect Reviews

With the instructions above, Copilot will now flag code like this:

```typescript
// ❌ Copilot will flag: string interpolation in SQL
const result = await db.query(`SELECT * FROM users WHERE id = '${userId}'`);

// ✅ Copilot will approve: parameterized query
const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
```

```typescript
// ❌ Copilot will flag: default export
export default function UserCard({ user }: { name: string }) { ... }

// ✅ Copilot will approve: named export with explicit props
interface UserCardProps {
  user: User;
}
export function UserCard({ user }: UserCardProps) { ... }
```

## Coding Standard Enforcement

Beyond custom instructions, you can combine Copilot reviews with structured coding standards.

### Layered Review Strategy

```
┌─────────────────────────────────────────────────┐
│              Pull Request Opened                 │
├─────────────────────────────────────────────────┤
│ Layer 1: Automated Linters (ESLint, Prettier)   │
│   → Catches formatting, syntax, simple rules    │
├─────────────────────────────────────────────────┤
│ Layer 2: Copilot Code Review                    │
│   → Catches logic errors, security, patterns    │
│   → Enforces custom instructions                │
├─────────────────────────────────────────────────┤
│ Layer 3: Human Reviewer                         │
│   → Architecture decisions, business logic      │
│   → Final approval                              │
└─────────────────────────────────────────────────┘
```

Each layer handles what it does best. Copilot bridges the gap between mechanical linting and human judgment.

### Organizing Standards by Category

Structure your instructions by concern area for maintainability:

```
.github/
├── copilot-review-instructions.md    # Main review instructions
└── copilot-instructions.md           # General coding instructions
```

Your `copilot-review-instructions.md` can reference external standards:

```markdown
# Review Standards

## Language: TypeScript
- Follow the team TypeScript style guide at docs/typescript-style.md.
- Prefer `unknown` over `any`. Flag any use of `any` that isn't
  explicitly justified with a comment.
- Use discriminated unions for state modeling, not boolean flags.

## Testing
- Every new function must have a corresponding test. Flag PRs that
  add functions without test coverage.
- Test names must follow the pattern: "should [expected behavior]
  when [condition]".
- No test should depend on external services — use mocks.
```

## Security-Focused Reviews

Copilot is particularly effective at catching security issues when given specific guidance.

### Security Review Instructions

Add a security section to your review instructions:

```markdown
## Security Requirements
- User input must NEVER be passed directly to:
  - SQL queries (use parameterized queries)
  - Shell commands (use allowlists, not sanitization)
  - HTML rendering (use framework-provided escaping)
  - File system paths (validate against a base directory)
- Authentication tokens must not appear in:
  - URL query parameters
  - Log output
  - Error messages returned to clients
- All endpoints handling user data must verify authorization,
  not just authentication.
- Cryptographic operations must use standard libraries —
  flag any custom crypto implementations.
```

### Common Security Patterns Copilot Catches

| Pattern | Risk | What Copilot Flags |
|---------|------|--------------------|
| `eval(userInput)` | Remote code execution | Direct use of `eval` with external data |
| `innerHTML = data` | Cross-site scripting (XSS) | Unescaped HTML injection |
| `` `SELECT * WHERE id = ${id}` `` | SQL injection | Interpolated query strings |
| `fs.readFile(userPath)` | Path traversal | Unsanitized file paths |
| `console.log(token)` | Secret leakage | Logging sensitive values |

## Performance Pattern Detection

Configure Copilot to watch for performance anti-patterns:

```markdown
## Performance Standards
- Database calls inside loops are ALWAYS flagged (N+1 problem).
  Use batch queries or JOINs instead.
- React components must not create new objects/arrays in render.
  Move constant data outside the component or use useMemo.
- API responses returning more than 100 items must support pagination.
- Synchronous file I/O (fs.readFileSync, fs.writeFileSync) is
  not allowed in request handlers. Use async alternatives.
```

### Example: N+1 Detection

```typescript
// ❌ Copilot will flag: N+1 query pattern
async function getUsersWithOrders(userIds: string[]) {
  const results = [];
  for (const id of userIds) {
    const user = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    const orders = await db.query("SELECT * FROM orders WHERE user_id = $1", [id]);
    results.push({ ...user.rows[0], orders: orders.rows });
  }
  return results;
}

// ✅ Copilot will approve: batch query
async function getUsersWithOrders(userIds: string[]) {
  const users = await db.query(
    "SELECT * FROM users WHERE id = ANY($1)",
    [userIds]
  );
  const orders = await db.query(
    "SELECT * FROM orders WHERE user_id = ANY($1)",
    [userIds]
  );

  return users.rows.map((user) => ({
    ...user,
    orders: orders.rows.filter((o) => o.user_id === user.id),
  }));
}
```

## Team Workflow Integration

### Branch Protection Rules

Combine Copilot reviews with branch protection for enforced quality gates:

1. Go to **Settings → Branches → Branch protection rules**
2. Enable **Require a pull request before merging**
3. Enable **Require review from Code owners**
4. Add Copilot as a required reviewer in your workflow

### CODEOWNERS Integration

Pair Copilot with human reviewers using a `CODEOWNERS` file:

```
# .github/CODEOWNERS

# Copilot reviews everything
*                       @copilot

# Security-sensitive files need human security review
src/auth/**             @security-team @copilot
src/crypto/**           @security-team @copilot

# Infrastructure changes need platform team
terraform/**            @platform-team @copilot
.github/workflows/**    @platform-team @copilot
```

This ensures Copilot provides immediate feedback while the right humans review critical areas.

### Review Workflow Automation

Use GitHub Actions to streamline the review process:

```yaml
# .github/workflows/review-checks.yml
name: Pre-Review Checks
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm test

  # Copilot reviews after CI passes
  # This ensures Copilot reviews clean code, not code
  # with obvious lint or test failures
```

## Review Metrics

Track the effectiveness of Copilot reviews over time:

### Key Metrics to Monitor

| Metric | What It Tells You | How to Measure |
|--------|-------------------|----------------|
| **Suggestions accepted** | How often Copilot finds real issues | Count accepted vs dismissed suggestions |
| **Time to first review** | How quickly PRs get initial feedback | Time between PR open and first Copilot comment |
| **Bug escape rate** | Whether Copilot catches bugs before production | Track bugs that Copilot flagged vs missed |
| **Review cycle time** | Whether Copilot speeds up the overall review process | Time from PR open to final approval |
| **False positive rate** | How often Copilot flags non-issues | Track dismissed suggestions as percentage of total |

### Iterating on Instructions

Review your custom instructions monthly:

1. **Collect dismissed suggestions** — if Copilot repeatedly flags something your team considers acceptable, update instructions to exclude it
2. **Add new patterns** — when bugs escape to production, add review instructions that would have caught them
3. **Remove stale rules** — as your codebase evolves, some rules become irrelevant

## Practical Exercise

**Task:** Set up custom review instructions for a repository you maintain:

1. Create `.github/copilot-review-instructions.md` with at least 5 rules specific to your project
2. Open a pull request that intentionally violates 3 of those rules
3. Request a Copilot review and verify it catches the violations
4. Refine your instructions based on what Copilot caught and missed
5. Document your team's accept/dismiss criteria

### Bonus Challenge

Create a "review scorecard" that tracks:
- Total Copilot suggestions per PR (average over 10 PRs)
- Acceptance rate by category (bug, security, style)
- Time saved compared to waiting for human review alone

## 🎯 What You Learned

- How to write custom review instructions in `.github/copilot-review-instructions.md`
- How to enforce coding standards for security, performance, and style
- How Copilot fits into a layered review strategy alongside linters and human reviewers
- How to integrate Copilot reviews with branch protection and CODEOWNERS
- How to track review effectiveness with metrics and iterate on instructions

## ➡️ Next Steps

Ready to build fully automated review pipelines? Continue to the advanced course:
- 🔴 [Automated Code Review Pipelines with Copilot Agents](/Learn-GHCP/courses/technology/code-review-advanced/)
