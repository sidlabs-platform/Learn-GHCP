---
title: "Spec-Driven Development with Copilot: Write Tests First"
description: "Learn Test-Driven Development (TDD) powered by Copilot — write specs and tests first, then let AI implement the code."
track: "technology"
difficulty: "beginner"
featureRefs:
  - code-completions
  - copilot-chat
  - ghost-text
personaTags:
  - developer
  - student
technologyTags:
  - testing
  - tdd
  - javascript
  - jest
estimatedMinutes: 25
lastGenerated: 2026-04-08
published: true
---

# 🟢 Spec-Driven Development with Copilot: Write Tests First

Welcome! In this course you'll learn the most powerful habit in software engineering — **writing tests before code** — and discover how Copilot turns your specs into working implementations in seconds.

## Prerequisites

- VS Code with the GitHub Copilot extension installed
- Node.js 18+ and npm
- Basic JavaScript / TypeScript knowledge
- Familiarity with running terminal commands

## What Is Spec-Driven Development?

Spec-driven development is a family of practices where **specifications come first and code follows**. The three most common flavors are:

| Approach | Specs Look Like | Key Idea |
|----------|----------------|----------|
| **TDD** (Test-Driven Development) | Unit tests (`expect(add(1,2)).toBe(3)`) | Write a failing test → make it pass → refactor |
| **BDD** (Behavior-Driven Development) | Gherkin scenarios (`Given … When … Then`) | Describe behavior in business language |
| **Contract-First** | OpenAPI / JSON Schema | Define the API surface before implementing |

All three share one principle: **you define WHAT the software should do before you write HOW it does it.**

## Why Specs + AI = Superpowers

Traditional TDD requires you to write the test *and* the implementation. With Copilot the workflow changes:

```
You write the spec (test)  →  Copilot writes the implementation
You verify correctness      →  Copilot helps you refactor
```

This is powerful because:

- **Tests are a precise prompt.** An `expect(fn(input)).toBe(output)` statement tells Copilot exactly what to build.
- **You stay in control.** The spec is *your* design intent; Copilot fills in the mechanical details.
- **Iteration is fast.** If a test fails, paste the failure into Copilot Chat and ask it to fix the implementation.

## The TDD Cycle with Copilot: Red → Green → Refactor

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │   🔴 RED        🟢 GREEN      🔵 REFACTOR   │
  │   Write a       Let Copilot   Clean up with  │
  │   failing test  implement     Copilot Chat   │
  │                                              │
  │   ────────►     ────────►     ────────►      │
  │                                   │          │
  │                                   ▼          │
  │                             Back to RED      │
  └──────────────────────────────────────────────┘
```

Let's walk through a hands-on example.

## Hands-On: Build a String Utility Library

We'll build a `stringUtils` module with four functions, using TDD + Copilot the entire way.

### Step 0: Set Up the Project

```bash
mkdir string-utils && cd string-utils
npm init -y
npm install --save-dev jest
```

Add a test script to `package.json`:

```json
{
  "scripts": {
    "test": "jest --verbose"
  }
}
```

Create the file structure:

```
string-utils/
├── src/
│   └── stringUtils.js      ← empty for now
├── __tests__/
│   └── stringUtils.test.js  ← we start here
└── package.json
```

### Step 1: Write Test Specs First

Open `__tests__/stringUtils.test.js` and write your specs. **Do not write any implementation yet.**

```javascript
const {
  capitalize,
  slugify,
  truncate,
  countWords,
} = require("../src/stringUtils");

describe("capitalize", () => {
  it("should capitalize the first letter of a lowercase word", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("should return an empty string unchanged", () => {
    expect(capitalize("")).toBe("");
  });

  it("should not change an already-capitalized string", () => {
    expect(capitalize("Hello")).toBe("Hello");
  });

  it("should handle single-character strings", () => {
    expect(capitalize("a")).toBe("A");
  });
});

describe("slugify", () => {
  it("should convert a sentence to a URL-friendly slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should remove special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("should collapse multiple spaces into one hyphen", () => {
    expect(slugify("too   many   spaces")).toBe("too-many-spaces");
  });

  it("should trim leading and trailing whitespace", () => {
    expect(slugify("  padded  ")).toBe("padded");
  });
});

describe("truncate", () => {
  it("should return the original string if under the limit", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("should truncate and add ellipsis when over the limit", () => {
    expect(truncate("this is a long sentence", 10)).toBe("this is a…");
  });

  it("should handle exact-length strings without truncating", () => {
    expect(truncate("exact", 5)).toBe("exact");
  });
});

describe("countWords", () => {
  it("should count words in a simple sentence", () => {
    expect(countWords("hello world")).toBe(2);
  });

  it("should return 0 for an empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("should handle multiple spaces between words", () => {
    expect(countWords("one   two   three")).toBe(3);
  });

  it("should handle leading and trailing whitespace", () => {
    expect(countWords("  spaced out  ")).toBe(2);
  });
});
```

> 💡 **Why write all the tests first?** Each `expect()` call is a concrete example of the behavior you want. This gives Copilot precise, unambiguous instructions.

### Step 2: Let Copilot Generate the Implementation

Open `src/stringUtils.js`. Type the module's opening comment and function signature, then **pause and let ghost text appear**:

```javascript
/**
 * String utility functions — implementation generated from test specs.
 */

function capitalize(str) {
```

Copilot will read your test file and suggest a complete implementation. Accept it with `Tab`, then move to the next function. Repeat for `slugify`, `truncate`, and `countWords`.

Alternatively, use **Copilot Chat** (agent mode) with this prompt:

```
Look at __tests__/stringUtils.test.js.
Implement all four functions in src/stringUtils.js so every test passes.
Export them with module.exports.
```

### Step 3: Run Tests and Iterate

```bash
npm test
```

**If all tests pass** — congratulations, you've completed your first Red → Green cycle!

**If some tests fail**, copy the failure output and paste it into Copilot Chat:

```
These tests are failing:
<paste Jest output>

Fix the implementation in src/stringUtils.js so all tests pass.
```

Copilot will analyze the assertion errors and propose a corrected implementation.

### Step 4: Refactor with Confidence

Now that all tests are green, ask Copilot Chat to improve the code:

```
Refactor src/stringUtils.js for readability and performance.
Do not change behavior — all existing tests must still pass.
```

After accepting the refactor, run `npm test` again. If tests pass, your refactor is safe. If any fail, Copilot introduced a regression — revert and try a more targeted refactor.

## Tools: Copilot Works with Every Test Runner

| Language | Test Runner | Spec Style |
|----------|------------|------------|
| JavaScript / TypeScript | **Jest**, **Vitest** | `describe` / `it` / `expect` |
| Python | **pytest** | `def test_…` / `assert` |
| Java | **JUnit 5** | `@Test` / `assertEquals` |
| C# | **xUnit**, **NUnit** | `[Fact]` / `Assert.Equal` |
| Go | **testing** | `func TestX(t *testing.T)` |

The TDD cycle is the same regardless of language. Write the test, let Copilot implement, run, iterate.

## Common Patterns for Writing Great Specs

### The Arrange-Act-Assert Pattern

```javascript
it("should apply a discount to the order total", () => {
  // Arrange — set up inputs
  const order = { total: 100, discountPercent: 15 };

  // Act — call the function under test
  const result = applyDiscount(order);

  // Assert — verify the outcome
  expect(result.total).toBe(85);
});
```

### Edge Cases as First-Class Specs

```javascript
describe("divide", () => {
  it("should divide two numbers", () => {
    expect(divide(10, 2)).toBe(5);
  });

  it("should throw when dividing by zero", () => {
    expect(() => divide(10, 0)).toThrow("Cannot divide by zero");
  });

  it("should handle negative numbers", () => {
    expect(divide(-10, 2)).toBe(-5);
  });
});
```

Edge-case tests give Copilot the constraints it needs to generate robust code.

## Troubleshooting: When Copilot Gets It Wrong

| Problem | Solution |
|---------|----------|
| Copilot generates a function that passes some tests but not others | Add more specific test cases for the failing scenarios, then regenerate |
| Ghost text suggests a completely unrelated implementation | Make sure the test file is open in a tab — Copilot uses open files as context |
| Implementation is correct but overly complex | Ask Copilot Chat: *"Simplify this function while keeping all tests green"* |
| Copilot suggests importing a library you don't want | Add a comment above the function: `// Pure implementation — no external dependencies` |

## 🎯 What You Learned

- The three flavors of spec-driven development: TDD, BDD, and contract-first
- How the Red → Green → Refactor cycle works with Copilot
- How to write test specs that act as precise prompts for Copilot
- How to iterate on failures using Copilot Chat
- How to refactor safely with a green test suite as your safety net

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **TDD** | Test-Driven Development — write a failing test, implement until it passes, then refactor |
| **BDD** | Behavior-Driven Development — describe behavior in business language (Given/When/Then) |
| **Spec** | A specification that defines expected behavior, typically expressed as a test or schema |
| **Assertion** | A statement that checks whether a value matches an expected result (`expect(x).toBe(y)`) |
| **Test runner** | A tool that discovers and executes tests (Jest, pytest, JUnit, etc.) |
| **Red-Green-Refactor** | The three-phase TDD cycle: write a failing test (red), make it pass (green), clean up (refactor) |
| **Ghost text** | Copilot's inline code suggestions that appear as dimmed text in the editor |
| **Describe/It blocks** | Jest/Vitest syntax for grouping (`describe`) and naming (`it`) test cases |

## ➡️ Next Steps

You've mastered TDD with Copilot at the unit level. Ready to scale up to full API development with BDD and contracts?

- 🟡 [BDD and Contract-First API Development with Copilot](/Learn-GHCP/courses/technology/spec-driven-dev-intermediate/)
