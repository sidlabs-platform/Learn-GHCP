---
title: "Copilot-Driven Development: Real-World Workflows"
description: "Master Copilot-driven development with test generation, refactoring, code review, and multi-file editing patterns."
track: "persona"
difficulty: "intermediate"
featureRefs:
  - code-completions
  - copilot-chat
  - inline-chat
  - agent-mode
personaTags:
  - developer
technologyTags:
  - vscode
  - typescript
  - testing
prerequisites:
  - developer-beginner
estimatedMinutes: 40
lastGenerated: 2026-04-08
published: true
---

# 🟡 Copilot-Driven Development: Real-World Workflows

In this intermediate course you'll move beyond basic suggestions and learn professional development workflows powered by Copilot — from test-driven development to multi-file refactoring with agent mode.

## Prerequisites

- Completed [Copilot for Developers: Your AI Pair Programmer](/Learn-GHCP/courses/persona/developer-beginner/)
- Familiarity with TypeScript and a testing framework (Jest or Vitest)
- VS Code with the Copilot extension installed

## Step 1: Test-Driven Development with Copilot

TDD with Copilot flips the typical workflow: you write the test, and Copilot implements the code to make it pass.

### Write the test first

Create `src/cart.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { ShoppingCart } from "./cart";

describe("ShoppingCart", () => {
  it("should start with an empty cart", () => {
    const cart = new ShoppingCart();
    expect(cart.items).toEqual([]);
    expect(cart.total).toBe(0);
  });

  it("should add items to the cart", () => {
    const cart = new ShoppingCart();
    cart.addItem({ id: "1", name: "Widget", price: 9.99, quantity: 2 });
    expect(cart.items).toHaveLength(1);
    expect(cart.total).toBeCloseTo(19.98);
  });

  it("should remove items from the cart", () => {
    const cart = new ShoppingCart();
    cart.addItem({ id: "1", name: "Widget", price: 9.99, quantity: 1 });
    cart.removeItem("1");
    expect(cart.items).toHaveLength(0);
    expect(cart.total).toBe(0);
  });

  it("should apply a percentage discount", () => {
    const cart = new ShoppingCart();
    cart.addItem({ id: "1", name: "Widget", price: 100, quantity: 1 });
    cart.applyDiscount(10); // 10% off
    expect(cart.total).toBe(90);
  });

  it("should not allow negative quantities", () => {
    const cart = new ShoppingCart();
    expect(() =>
      cart.addItem({ id: "1", name: "Widget", price: 9.99, quantity: -1 })
    ).toThrow("Quantity must be positive");
  });
});
```

### Let Copilot implement the class

Create `src/cart.ts` and type the class skeleton with a comment:

```typescript
// Implement ShoppingCart class to pass all tests in cart.test.ts
// Items have: id, name, price, quantity
// Methods: addItem, removeItem, applyDiscount
// Properties: items (array), total (computed)

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}
```

Pause after the interface — Copilot will suggest the full `ShoppingCart` class. Accept and refine:

```typescript
export class ShoppingCart {
  private _items: CartItem[] = [];
  private _discountPercent: number = 0;

  get items(): CartItem[] {
    return [...this._items];
  }

  get total(): number {
    const subtotal = this._items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return subtotal * (1 - this._discountPercent / 100);
  }

  addItem(item: CartItem): void {
    if (item.quantity <= 0) {
      throw new Error("Quantity must be positive");
    }
    const existing = this._items.find((i) => i.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      this._items.push({ ...item });
    }
  }

  removeItem(id: string): void {
    this._items = this._items.filter((item) => item.id !== id);
  }

  applyDiscount(percent: number): void {
    if (percent < 0 || percent > 100) {
      throw new Error("Discount must be between 0 and 100");
    }
    this._discountPercent = percent;
  }
}
```

Run the tests:

```bash
npx vitest run src/cart.test.ts
```

> 🔑 **Key insight:** By writing tests first, you give Copilot a precise specification. The AI can read your test expectations and generate code that satisfies them.

## Step 2: Refactoring Patterns with Inline Chat

Inline Chat (`Ctrl+I`) lets you refactor code in place without leaving the editor.

### Extract a function

Select a block of logic and press `Ctrl+I`:

```
Extract the discount calculation into a separate private method called calculateSubtotal
```

### Rename and restructure

Select a class and ask inline chat:

```
Refactor this class to use the Strategy pattern for different discount types
(percentage, fixed amount, buy-one-get-one)
```

### Convert patterns

Select callback-style code and type:

```
Convert these callbacks to async/await
```

**Before:**
```typescript
function fetchUserData(userId: string, callback: (err: Error | null, data?: User) => void) {
  db.query("SELECT * FROM users WHERE id = ?", [userId], (err, rows) => {
    if (err) return callback(err);
    if (rows.length === 0) return callback(new Error("User not found"));
    callback(null, rows[0]);
  });
}
```

**After (Copilot-refactored):**
```typescript
async function fetchUserData(userId: string): Promise<User> {
  const rows = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
  if (rows.length === 0) {
    throw new Error("User not found");
  }
  return rows[0];
}
```

## Step 3: Multi-File Edits with Agent Mode

Agent mode is Copilot's most powerful feature for large changes. It can read multiple files, plan changes, and apply edits across your project.

### Activate agent mode

In Copilot Chat, switch to **Agent** mode using the mode selector at the top of the chat panel.

### Example: Add logging to an entire module

```
Add structured logging with Winston to all route handlers in src/routes/.
Each handler should log the request method, path, and duration.
Create a shared logger utility in src/utils/logger.ts.
```

Agent mode will:
1. Scan all files in `src/routes/`
2. Create `src/utils/logger.ts` with a configured Winston logger
3. Add import statements and logging calls to each route handler
4. Show you a diff preview before applying

### Example: Add error handling middleware

```
Create an Express error-handling middleware in src/middleware/errorHandler.ts.
Update all route files in src/routes/ to use next(error) instead of
res.status(500).json(). Register the middleware in src/app.ts.
```

> 💡 **Tip:** Agent mode works best when you describe the *outcome* you want, not the exact steps. Let it figure out which files to modify.

## Step 4: Code Review Assistance

Use Copilot to review code before you submit a PR.

### Review a diff

Select changed code and ask:

```
Review this code for potential bugs, security issues, and performance problems
```

### Generate PR descriptions

In Copilot Chat:

```
Summarize the changes in my current git diff as a PR description
with a bullet list of what changed and why
```

### Check for common issues

```
Analyze this function for:
- Edge cases that aren't handled
- Potential null/undefined errors
- Missing input validation
```

## Step 5: Prompt Engineering for Better Suggestions

The quality of Copilot's output depends on the context you provide. Here are proven patterns:

### The specification comment

```typescript
/**
 * Parse a cron expression string into its component parts.
 *
 * Input format: "minute hour dayOfMonth month dayOfWeek"
 * Each field can be: a number, * (any), */n (every n), or a range (1-5)
 *
 * @example parseCron("*/15 * * * *") → { minute: { type: "step", value: 15 }, ... }
 * @throws {Error} If the expression has fewer than 5 fields
 */
function parseCron(expression: string): CronSchedule {
```

### The example-driven prompt

```typescript
// Convert temperature between units
// Examples:
//   convert(100, "C", "F") → 212
//   convert(32, "F", "C") → 0
//   convert(373.15, "K", "C") → 100
function convert(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
```

### The constraint comment

```typescript
// Rate limiter using the sliding window algorithm
// - Must be thread-safe
// - Window size is configurable
// - Returns { allowed: boolean, remaining: number, resetAt: Date }
// - Do NOT use external libraries
class SlidingWindowRateLimiter {
```

> 🔑 **Key insight:** Providing examples, constraints, and expected I/O significantly improves Copilot's output quality.

## Step 6: Context Optimization

Copilot reads open files and nearby code for context. Optimize this by:

### Keep related files open

When working on `userService.ts`, keep these tabs open:
- `user.model.ts` — so Copilot knows your data shape
- `user.test.ts` — so Copilot understands expected behavior
- `types.ts` — so Copilot uses your type definitions

### Use `@workspace` in chat

```
@workspace How is authentication implemented in this project?
```

This lets Copilot search your entire workspace, not just the current file.

### Pin context with `#file`

```
Using the schema in #file:src/db/schema.ts, generate a migration
that adds a "lastLoginAt" column to the users table
```

## 🎯 Hands-On Exercise: Refactor a Legacy Module

Take this legacy code and refactor it using the techniques you've learned:

```typescript
// legacy-user-manager.ts — Refactor this using Copilot
var users: any[] = [];

function addUser(name: any, email: any, role: any) {
  var user = { id: users.length + 1, name: name, email: email, role: role, created: new Date() };
  for (var i = 0; i < users.length; i++) {
    if (users[i].email == email) {
      return { error: "Email already exists" };
    }
  }
  users.push(user);
  return user;
}

function getUsers(role: any) {
  var result = [];
  for (var i = 0; i < users.length; i++) {
    if (role == undefined || users[i].role == role) {
      result.push(users[i]);
    }
  }
  return result;
}

function deleteUser(id: any) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].id == id) {
      users.splice(i, 1);
      return true;
    }
  }
  return false;
}
```

**Your tasks:**
1. Write comprehensive tests for the existing behavior
2. Use Copilot to refactor: add types, use modern syntax, add validation
3. Use inline chat to extract a `UserRepository` class
4. Add error handling with custom exception types
5. Verify all tests still pass

## 🎯 What You Learned

- Test-driven development with Copilot as the implementer
- Inline Chat for in-place refactoring and code transformations
- Agent mode for multi-file edits and large-scale changes
- Code review workflows with Copilot assistance
- Prompt engineering techniques for higher-quality suggestions
- Context optimization to give Copilot the best input

## 📚 Glossary

- **Agent mode**: Copilot's multi-file editing mode that can read, plan, and modify across your project
- **Inline Chat**: A lightweight Copilot prompt that appears in the editor for quick transformations
- **Ghost text**: The semi-transparent code suggestion that appears as you type
- **Context window**: The set of files and code Copilot uses to generate suggestions
- **TDD (Test-Driven Development)**: Writing tests before implementation code

## ➡️ Next Steps

Ready for the advanced course?
- 🔴 [Copilot Power User: Custom Tools and Automation](/Learn-GHCP/courses/persona/developer-advanced/)
