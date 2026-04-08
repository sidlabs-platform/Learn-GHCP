---
title: "AI-Assisted Refactoring: Clean Code with Copilot"
description: "Use Copilot to identify code smells, apply refactoring patterns, and modernize legacy code safely."
track: "technology"
difficulty: "beginner"
featureRefs:
  - copilot-chat
  - inline-chat
  - code-completions
personaTags:
  - developer
technologyTags:
  - refactoring
  - clean-code
  - copilot
estimatedMinutes: 25
lastGenerated: 2026-04-08
published: true
---

# 🟢 AI-Assisted Refactoring: Clean Code with Copilot

Refactoring — restructuring code without changing its behavior — is one of the most impactful ways to keep a codebase maintainable. GitHub Copilot accelerates this process by detecting code smells, suggesting cleaner patterns, and applying transformations safely across your files.

In this course you'll learn how to partner with Copilot to turn messy code into clean, well-structured modules.

## Prerequisites

- GitHub Copilot active in VS Code
- Basic familiarity with at least one programming language (examples use TypeScript)
- A project open in VS Code (your own or a sample repo)

---

## What Is Refactoring?

Refactoring is the disciplined practice of improving code structure while preserving external behavior. Think of it as cleaning up a workshop — every tool still works, but now you can find things quickly and safely.

| Term | Meaning |
|------|---------|
| **Refactoring** | Changing code structure without changing behavior |
| **Code Smell** | A surface indication of a deeper design problem |
| **Safe Refactoring** | Refactoring backed by tests that verify nothing broke |
| **Extract** | Moving a block of code into its own function or variable |
| **Rename** | Changing a symbol name consistently everywhere it's used |

> 💡 **Tip:** Refactoring is safest when you have tests. Before large refactors, ask Copilot: *"Generate unit tests for this function so I can refactor it safely."*

---

## Common Code Smells Copilot Can Detect

Copilot Chat excels at reviewing code for structural problems. Try asking it to analyze your code.

### How to Ask Copilot for a Code Review

Select a block of code, open inline chat (`Ctrl+I`), and type:

```
Review this code for code smells and suggest refactoring improvements
```

Copilot can identify these common smells:

| Code Smell | What It Looks Like | Copilot Fix |
|------------|-------------------|-------------|
| **Long Function** | Function > 30 lines doing multiple things | Extract helper functions |
| **Duplicated Code** | Same logic copy-pasted in multiple places | Extract shared utility |
| **Magic Numbers** | Hard-coded values like `86400` or `0.15` | Extract named constants |
| **Deep Nesting** | 4+ levels of `if`/`for`/`while` | Early returns, guard clauses |
| **God Object** | One class/module that does everything | Split into focused modules |
| **Long Parameter List** | Function with 5+ parameters | Use an options object |

### Example: Detecting a Long Function

Given this messy code:

```typescript
// ❌ Code smell: long function doing too many things
function processOrder(items: any[], userId: string, coupon: string) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type === "physical") {
      total += items[i].price * items[i].quantity;
      if (items[i].weight > 50) {
        total += 15.99; // heavy item surcharge
      }
    } else if (items[i].type === "digital") {
      total += items[i].price * items[i].quantity;
    } else if (items[i].type === "subscription") {
      total += items[i].price;
    }
  }
  if (coupon === "SAVE10") {
    total = total * 0.9;
  } else if (coupon === "SAVE20") {
    total = total * 0.8;
  } else if (coupon === "FREESHIP") {
    // remove shipping from physical items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === "physical" && items[i].weight > 50) {
        total -= 15.99;
      }
    }
  }
  console.log("Order total: " + total);
  // ... 30 more lines of tax calculation, logging, and email sending
  return total;
}
```

Ask Copilot Chat: *"What code smells do you see in this function?"*

Copilot will identify: long function, magic numbers, mixed responsibilities, duplicated iteration, and lack of typing.

---

## Using `/fix` and Inline Chat for Refactoring

VS Code with Copilot provides two fast refactoring entry points:

### Method 1: The `/fix` Command

In Copilot Chat, type `/fix` followed by a description:

```
/fix Extract the coupon discount logic into a separate function
```

Copilot will generate a diff showing the extracted function and the updated call site.

### Method 2: Inline Chat (`Ctrl+I`)

1. **Select** the code you want to refactor
2. Press `Ctrl+I` to open inline chat
3. Type your refactoring instruction:

```
Extract this into a pure function called calculateItemTotal
```

Copilot applies the change directly in your editor with an accept/reject preview.

### Common Refactoring Prompts

| Goal | Prompt |
|------|--------|
| Extract function | *"Extract this block into a function called `{name}`"* |
| Simplify conditionals | *"Replace this if/else chain with early returns"* |
| Remove magic numbers | *"Extract hard-coded values into named constants"* |
| Add types | *"Add TypeScript types to this function's parameters and return value"* |
| Reduce nesting | *"Flatten this nested logic using guard clauses"* |

---

## Safe Rename, Extract, and Move Patterns

### Rename

Renaming is the simplest refactoring but one of the most valuable. Copilot respects scope and usage:

1. Place your cursor on the symbol
2. Press `F2` (VS Code rename) — this uses the language server
3. Or use inline chat: *"Rename this variable from `d` to `deliveryDate`"*

> 💡 **Tip:** For multi-file renames, use Copilot Chat: *"Rename the `UserService` class to `UserAccountService` across the entire project."*

### Extract Function

Select a block of code and use inline chat:

```
Extract this into a function called calculateShippingSurcharge
```

**Before:**

```typescript
// ❌ Inline calculation buried in a loop
for (const item of items) {
  if (item.type === "physical" && item.weight > 50) {
    total += 15.99;
  }
}
```

**After:**

```typescript
// ✅ Clear, named, testable function
function calculateShippingSurcharge(item: OrderItem): number {
  const HEAVY_ITEM_THRESHOLD = 50;
  const HEAVY_ITEM_SURCHARGE = 15.99;
  if (item.type === "physical" && item.weight > HEAVY_ITEM_THRESHOLD) {
    return HEAVY_ITEM_SURCHARGE;
  }
  return 0;
}

for (const item of items) {
  total += calculateShippingSurcharge(item);
}
```

### Extract Variable

Replace complex expressions with a named variable:

```typescript
// ❌ Hard to understand
if (user.age >= 18 && user.hasVerifiedEmail && !user.isBanned && user.accountAge > 30) {

// ✅ Self-documenting
const isEligibleUser = user.age >= 18
  && user.hasVerifiedEmail
  && !user.isBanned
  && user.accountAge > 30;

if (isEligibleUser) {
```

### Move to File

When a function grows beyond its current module's scope:

```
Move the calculateShippingSurcharge function to a new file called src/utils/shipping.ts
```

Copilot will create the new file with proper exports and update all import statements.

---

## 🏋️ Hands-On: Refactor a Messy Function Step by Step

Let's apply everything you've learned. Start with this messy function and refactor it using Copilot.

### The Starting Code

Create a file `order-processor.ts` with this code:

```typescript
function handleOrder(
  items: any[],
  user: any,
  couponCode: string,
  shippingMethod: string,
  giftWrap: boolean
) {
  let subtotal = 0;
  let shipping = 0;
  let tax = 0;
  let discount = 0;

  for (let i = 0; i < items.length; i++) {
    subtotal += items[i].price * items[i].qty;
  }

  if (couponCode === "WELCOME10") {
    discount = subtotal * 0.1;
  } else if (couponCode === "VIP25") {
    discount = subtotal * 0.25;
  } else if (couponCode === "FLAT5") {
    discount = 5;
  }

  if (shippingMethod === "express") {
    shipping = 12.99;
  } else if (shippingMethod === "overnight") {
    shipping = 24.99;
  } else {
    shipping = 4.99;
  }

  if (giftWrap) {
    shipping += 3.5;
  }

  if (user.state === "CA") {
    tax = (subtotal - discount) * 0.0725;
  } else if (user.state === "TX") {
    tax = (subtotal - discount) * 0.0625;
  } else if (user.state === "NY") {
    tax = (subtotal - discount) * 0.08;
  } else {
    tax = (subtotal - discount) * 0.05;
  }

  let total = subtotal - discount + shipping + tax;
  console.log("User: " + user.name + " Total: $" + total.toFixed(2));
  return { subtotal, discount, shipping, tax, total };
}
```

### Step 1 — Identify Smells

Select the entire function and ask Copilot Chat:

```
What code smells do you see in this function? List each with a severity.
```

Expected findings: magic numbers, long parameter list, mixed responsibilities, no types, `any` usage.

### Step 2 — Add Types

Use inline chat on the function signature:

```
Replace the any types with proper TypeScript interfaces
```

### Step 3 — Extract Constants

Select the magic numbers and ask:

```
Extract all magic numbers into named constants at the top of the file
```

### Step 4 — Extract Functions

Select the coupon logic and ask:

```
Extract the coupon discount calculation into a pure function
```

Repeat for shipping, tax, and gift wrap logic.

### Step 5 — Use an Options Object

Select the function parameters and ask:

```
Replace the parameter list with a single OrderRequest options object
```

### Final Result

After all steps, your code should have:

- ✅ Proper TypeScript interfaces (`OrderItem`, `User`, `OrderRequest`)
- ✅ Named constants (`TAX_RATES`, `SHIPPING_RATES`, `COUPON_DISCOUNTS`)
- ✅ Pure helper functions (`calculateDiscount`, `calculateShipping`, `calculateTax`)
- ✅ A clean orchestrator function that composes the helpers
- ✅ No magic numbers, no `any` types, no deep nesting

> ⚠️ **Warning:** Always verify refactored code still produces the same output. Run tests before and after each step.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Copilot suggests a different refactoring than expected | Be more specific in your prompt — mention the exact pattern you want |
| Inline chat doesn't appear | Check that Copilot is active (look for the Copilot icon in the status bar) |
| Extracted function has wrong parameters | Select the entire scope of variables used, then ask Copilot to extract |
| Rename misses some occurrences | Use VS Code's built-in rename (`F2`) for language-aware renaming |

---

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Code Smell** | A surface pattern in code that suggests a deeper structural problem |
| **Extract Function** | Moving a block of code into a new, named function |
| **Extract Variable** | Replacing a complex expression with a named variable |
| **Guard Clause** | An early return that handles an edge case to reduce nesting |
| **Inline Chat** | Copilot's in-editor chat accessed with `Ctrl+I` |
| **Magic Number** | A hard-coded numeric value with no explanatory name |
| **Pure Function** | A function that always returns the same output for the same input |

---

## ➡️ Next Steps

Ready to tackle bigger refactoring challenges?

- **Next course:** [Design Pattern Migration with Copilot](/Learn-GHCP/courses/technology/refactoring-intermediate/) — apply Strategy, Factory, and Observer patterns with multi-file agent mode
- **Related:** [Your First Copilot Cloud Agent](/Learn-GHCP/courses/agents/copilot-agents-beginner/) — automate refactoring tasks with cloud agents
