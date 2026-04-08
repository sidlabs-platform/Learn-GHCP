---
title: "Mastering Copilot Chat: Your AI Coding Companion"
description: "Learn Copilot Chat essentials — ask questions, explain code, generate snippets, and debug errors directly in your IDE."
track: "technology"
difficulty: "beginner"
featureRefs:
  - copilot-chat
  - inline-chat
personaTags:
  - developer
  - student
technologyTags:
  - vscode
  - copilot
  - chat
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

# 🟢 Mastering Copilot Chat: Your AI Coding Companion

Welcome! In this course you'll learn how to use GitHub Copilot Chat — the conversational AI assistant built into your editor — to ask questions, explain code, generate snippets, and debug errors without leaving your IDE.

## Prerequisites

- A GitHub account with **Copilot Individual**, **Copilot Business**, or **Copilot Enterprise** access
- **Visual Studio Code** (v1.93 or later) with the GitHub Copilot extension installed
- Basic familiarity with at least one programming language

## What Is Copilot Chat?

Copilot Chat is a conversational AI interface integrated directly into VS Code. Unlike Copilot's inline completions (which suggest code as you type), Chat lets you have a back-and-forth conversation about your code.

| Feature | Inline Completions | Copilot Chat |
|---------|-------------------|--------------|
| **Interaction** | Automatic suggestions as you type | Conversational Q&A |
| **Trigger** | Start typing code | Open Chat panel or press a shortcut |
| **Scope** | Current file context | Entire workspace or specific files |
| **Output** | Code inserted at cursor | Explanations, code blocks, commands |
| **Best for** | Writing new code fast | Understanding, debugging, refactoring |

Think of inline completions as a **co-pilot flying alongside you**, and Chat as a **knowledgeable colleague** you can ask anything.

## Step 1: Opening the Chat Panel

There are three ways to access Copilot Chat in VS Code:

### Option A: Sidebar Panel (Persistent)

1. Click the **Copilot Chat** icon in the Activity Bar (left sidebar), or
2. Press `Ctrl+Alt+I` (Windows/Linux) or `Cmd+Alt+I` (macOS)

This opens a persistent panel where your conversation history is preserved across interactions.

### Option B: Inline Chat (Contextual)

1. Place your cursor in the editor on any line of code
2. Press `Ctrl+I` (Windows/Linux) or `Cmd+I` (macOS)
3. A small chat input appears right where your cursor is

Inline Chat is perfect for quick, targeted questions about the code immediately surrounding your cursor.

### Option C: Quick Chat (Ephemeral)

1. Press `Ctrl+Shift+Alt+L` to open a lightweight floating chat
2. Ask a quick question and dismiss it

> 💡 **Tip:** Use the sidebar panel for extended conversations, inline chat for quick code-level questions, and quick chat for one-off lookups.

## Step 2: Asking Code Questions

The simplest way to use Chat is to ask a question in natural language. Open the Chat panel and type:

```
What does the Array.reduce() method do in JavaScript?
```

Copilot responds with a clear explanation and often includes a code example:

```javascript
// Copilot's example: sum an array of numbers with reduce
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((accumulator, current) => {
  return accumulator + current;
}, 0);
console.log(sum); // 15
```

### Asking About Your Own Code

Open a file and ask Chat about it directly:

```
What does the function on line 42 do?
```

Or select a block of code, right-click, and choose **Copilot → Explain This**. Chat will analyze the selected code and give a line-by-line breakdown.

## Step 3: Explaining Code with /explain

The `/explain` slash command is purpose-built for code comprehension. Select any code block and type:

```
/explain
```

**Example:** Select this Python function and run `/explain`:

```python
def fibonacci(n):
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b
```

Copilot will respond with something like:

> *This function computes the nth Fibonacci number iteratively. It starts with `a=0` and `b=1`, then swaps values in a loop, building up the sequence without recursion. This avoids the exponential time complexity of a naive recursive approach.*

## Step 4: Generating Code from Descriptions

You can ask Chat to write code for you by describing what you need:

```
Write a TypeScript function that validates an email address using a regex.
Return true if valid, false otherwise. Include JSDoc.
```

Copilot generates:

```typescript
/**
 * Validates whether a given string is a properly formatted email address.
 * @param email - The email string to validate.
 * @returns True if the email format is valid, false otherwise.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

To insert the generated code into your file, click the **Insert at Cursor** button or the **Copy** button in the Chat response.

## Step 5: Debugging Errors with /fix

When you encounter an error, select the problematic code and use:

```
/fix
```

**Example:** You have a bug in this JavaScript function:

```javascript
function getFullName(user) {
  return user.firstName + " " + user.LastName; // Bug: wrong property name
}
```

Select the function, type `/fix`, and Copilot identifies the issue:

> *The property `user.LastName` should be `user.lastName` (camelCase). JavaScript object properties are case-sensitive.*

It then proposes the corrected code:

```javascript
function getFullName(user) {
  return user.firstName + " " + user.lastName;
}
```

## Step 6: Generating Tests with /tests

Select a function and type `/tests` to auto-generate test cases:

```
/tests
```

For the `isValidEmail` function above, Copilot generates:

```typescript
import { describe, it, expect } from "vitest";
import { isValidEmail } from "./validation";

describe("isValidEmail", () => {
  it("returns true for a standard email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("returns true for an email with subdomain", () => {
    expect(isValidEmail("user@mail.example.com")).toBe(true);
  });

  it("returns false for an email without @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("returns false for an email without domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("returns false for an email with spaces", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
  });
});
```

## Step 7: Using Context References

Context references let you point Chat at specific parts of your workspace:

| Reference | What It Does | Example |
|-----------|-------------|---------|
| `#file` | References a specific file | `Explain #file:src/auth.ts` |
| `#selection` | References your current text selection | `Refactor #selection to use async/await` |
| `@workspace` | Searches your entire workspace | `@workspace Where is the database connection configured?` |

### Example: Cross-File Questions

```
@workspace Which files import the UserService class?
```

Copilot searches your workspace index and returns a list of files that import `UserService`, along with the relevant import lines.

## Step 8: Chat History and Conversations

Copilot Chat maintains conversation context within a session. This means you can ask follow-up questions:

```
You: Write a function to fetch user data from an API
Copilot: [generates fetchUser function]
You: Add error handling with try/catch
Copilot: [updates the function with error handling]
You: Now make it accept a timeout parameter
Copilot: [adds timeout parameter with AbortController]
```

To start a fresh conversation, click the **New Chat** (`+`) button at the top of the Chat panel.

> 💡 **Tip:** Keep conversations focused on a single topic. If you switch subjects, start a new chat session to avoid confusing the context.

## Hands-On Exercise

Practice everything you've learned with this guided exercise:

### Task: Build a Temperature Converter

1. **Open Chat** and ask:
   ```
   Write a TypeScript module with functions to convert Celsius to Fahrenheit
   and Fahrenheit to Celsius. Include JSDoc comments and input validation.
   ```

2. **Insert** the generated code into a new file `src/temperature.ts`

3. **Select** the code and type `/explain` to verify you understand the implementation

4. **Use inline chat** (`Ctrl+I`) on the validation logic and ask:
   ```
   What happens if someone passes NaN?
   ```

5. **Generate tests** by selecting the module and typing `/tests`

6. **Introduce a bug** (e.g., change `* 9/5` to `* 9/4`) and use `/fix` to see if Chat catches it

### Expected Result

After completing this exercise, you should have:
- A working `temperature.ts` module with two conversion functions
- A `temperature.test.ts` file with comprehensive tests
- Confidence using `/explain`, `/fix`, and `/tests` in your workflow

## Slash Commands Reference

| Command | Purpose | When to Use |
|---------|---------|------------|
| `/explain` | Explain selected code | Understanding unfamiliar code |
| `/fix` | Fix bugs in selected code | Debugging errors |
| `/tests` | Generate tests for selected code | Adding test coverage |
| `/doc` | Generate documentation | Writing JSDoc, docstrings |
| `/clear` | Clear chat history | Starting fresh |

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Copilot Chat** | A conversational AI interface in VS Code for code-related Q&A, generation, and debugging |
| **Inline Chat** | A lightweight chat input embedded directly in the editor at the cursor position |
| **Slash command** | A Chat shortcut prefixed with `/` that triggers a specific action (e.g., `/explain`) |
| **Context reference** | A `#` or `@` prefixed token that tells Chat where to look (e.g., `#file`, `@workspace`) |
| **Chat participant** | A scoped provider in Chat accessed with `@` that specializes in a domain (e.g., `@workspace`) |

## ➡️ Next Steps

Ready to unlock the full power of Chat participants and multi-turn workflows? Continue to the intermediate course:
- 🟡 [Advanced Copilot Chat: Context, Participants, and Workflows](/Learn-GHCP/courses/technology/copilot-chat-intermediate/)
