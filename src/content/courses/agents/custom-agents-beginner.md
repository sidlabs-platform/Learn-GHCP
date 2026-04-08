---
title: "Exploring Agent Mode in Copilot Chat"
description: "Discover Copilot's agent mode for multi-step autonomous coding tasks, learn when to use it, and complete your first agentic workflow."
track: "agents"
difficulty: "beginner"
featureRefs:
  - agent-mode
  - copilot-chat
personaTags:
  - developer
  - student
technologyTags:
  - vscode
  - copilot
  - github
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

# 🟢 Exploring Agent Mode in Copilot Chat

Welcome! In this course, you'll discover **agent mode** — Copilot's most powerful interaction pattern. Instead of answering one question at a time, agent mode autonomously plans, edits files, runs commands, and iterates until a task is complete.

## Prerequisites

- VS Code with the GitHub Copilot extension installed
- A GitHub account with Copilot access
- A workspace with at least one project folder open

## What Is Agent Mode?

Copilot Chat offers several interaction patterns. Understanding the differences helps you pick the right tool for the job.

| Mode | What It Does | Best For |
|------|-------------|----------|
| **Chat mode** | Answers a single question or generates a snippet | Quick lookups, explanations |
| **Edit mode** | Applies targeted edits to selected code | Renaming, reformatting, small fixes |
| **Agent mode** | Plans multi-step tasks, reads/writes files, runs terminal commands autonomously | Features, refactors, bug hunts |

### How Agent Mode Works Under the Hood

When you give agent mode a task, it follows a loop:

```
┌─────────────┐
│  Read files  │◄────────────────────┐
└──────┬──────┘                      │
       ▼                             │
┌─────────────┐    ┌────────────┐    │
│  Plan edits  │───►│ Apply edits │───►│
└─────────────┘    └──────┬─────┘    │
                          ▼          │
                   ┌────────────┐    │
                   │Run terminal │────┘
                   │  commands   │
                   └────────────┘
```

The agent repeats this cycle — reading context, making changes, running commands — until the task is done or it needs your approval.

## Step 1: Activate Agent Mode

Open the Copilot Chat panel in VS Code. At the top of the chat input, select the mode dropdown and switch to **Agent**.

> 💡 **Tip:** You can also type `@workspace` before your prompt in older versions, but the dedicated Agent mode toggle is preferred in current VS Code.

## Step 2: Your First Agentic Task

Let's try a real task: refactoring a utility function that's duplicated across multiple files.

### Set Up the Sample Project

Create these three files in a new folder called `agent-demo/`:

**`agent-demo/src/orders.js`**

```javascript
// Duplicated formatting logic
function formatCurrency(amount) {
  return "$" + amount.toFixed(2);
}

export function getOrderSummary(order) {
  return {
    id: order.id,
    total: formatCurrency(order.total),
    tax: formatCurrency(order.tax),
  };
}
```

**`agent-demo/src/invoices.js`**

```javascript
// Same duplicated formatting logic
function formatCurrency(amount) {
  return "$" + amount.toFixed(2);
}

export function getInvoiceLine(item) {
  return `${item.name}: ${formatCurrency(item.price)} x ${item.qty}`;
}
```

**`agent-demo/src/reports.js`**

```javascript
// Yet another copy
function formatCurrency(amount) {
  return "$" + amount.toFixed(2);
}

export function generateReport(data) {
  return data.map((row) => ({
    label: row.label,
    value: formatCurrency(row.amount),
  }));
}
```

### Give Agent Mode the Task

In the Agent mode chat, type:

```
Extract the duplicated formatCurrency function from orders.js, invoices.js,
and reports.js into a shared utils/currency.js module, then update all
three files to import from the new module.
```

### Watch What Happens

Agent mode will:

1. **Read** all three source files to find the duplicated function
2. **Create** a new file `utils/currency.js` with the shared implementation
3. **Edit** each of the three files to remove the local function and add an import
4. **Run** any available linters or tests to verify nothing broke

You'll see each step appear in the chat with diffs you can review.

## Step 3: Review and Accept Changes

Agent mode doesn't silently commit — it shows you every proposed change.

For each file edit, you'll see:

- A **diff view** showing the before/after
- **Accept** / **Discard** buttons per file
- A summary of the overall change

**Best practice:** Review the import paths carefully. Agent mode infers relative paths based on your project structure, but occasionally gets them wrong.

> 💡 **Troubleshooting:** If agent mode can't find your files, make sure the project folder is open as the VS Code workspace root (not a parent directory).

## Step 4: Verify the Refactor

After accepting the changes, confirm everything works:

```bash
# If you have a test suite
npm test

# Or just verify the imports resolve
node -e "import('./src/orders.js').then(m => console.log(m.getOrderSummary({id:1, total:9.99, tax:0.80})))"
```

**Expected output:**

```json
{ "id": 1, "total": "$9.99", "tax": "$0.80" }
```

## Agent Mode vs. Chat Mode — When to Choose

| Scenario | Use Agent Mode? | Why |
|----------|:-:|-----|
| "What does this regex do?" | ❌ | Single-turn question — chat is faster |
| "Add error handling to all API routes" | ✅ | Multi-file, repetitive edits |
| "Refactor class hierarchy into composition" | ✅ | Requires reading, planning, editing |
| "Explain the difference between `let` and `const`" | ❌ | Conceptual question — no edits needed |
| "Rename `userId` to `userID` across the project" | ✅ | Cross-file search-and-replace with context |

## Practice Exercise

Try these tasks in agent mode on your own projects:

1. **Add JSDoc comments** to all exported functions in a module
2. **Convert a callback-based function** to async/await
3. **Extract inline styles** from a React component into a CSS module

## 🎯 What You Learned

- The difference between chat, edit, and agent mode
- How agent mode's read → plan → edit → run loop works
- How to give agent mode a well-scoped task
- How to review, accept, and verify agent-proposed changes

## 📚 Glossary

- **Agent mode**: An autonomous Copilot interaction pattern that plans and executes multi-step coding tasks
- **Agentic loop**: The iterative cycle of reading files, planning, editing, and running commands
- **Tool use**: When the agent invokes capabilities like file reading, terminal commands, or search
- **Human-in-the-loop**: The review step where you approve or reject the agent's proposed changes

## ➡️ Next Steps

Ready to build your own specialized agents? Continue to the intermediate course:
- 🟡 [Build a Custom Development Agent](/Learn-GHCP/courses/agents/custom-agents-intermediate/)
