---
title: "Copilot for Developers: Your AI Pair Programmer"
description: "Set up Copilot in VS Code, learn to write code with AI suggestions, and boost your daily development productivity."
track: "persona"
difficulty: "beginner"
featureRefs:
  - code-completions
  - copilot-chat
  - ghost-text
personaTags:
  - developer
technologyTags:
  - vscode
  - javascript
  - python
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

# 🟢 Copilot for Developers: Your AI Pair Programmer

Welcome! In this beginner course you'll set up GitHub Copilot in VS Code, learn to work with ghost-text suggestions, and start building code faster with your new AI pair programmer.

## Prerequisites

- A GitHub account with an active Copilot subscription
- Visual Studio Code (latest stable release)
- Node.js 20+ installed (for the hands-on exercise)

## Step 1: Install the Copilot Extension

Open VS Code and install the GitHub Copilot extension:

1. Press `Ctrl+Shift+X` to open the Extensions panel.
2. Search for **GitHub Copilot**.
3. Click **Install** on the official extension by GitHub.

```text
✅ GitHub Copilot extension installed
✅ GitHub Copilot Chat extension installed (bundled)
```

> 💡 **Tip:** Make sure you're signed in to your GitHub account in VS Code. Click the account icon in the bottom-left corner if prompted.

## Step 2: Understanding Ghost Text

Ghost text is the semi-transparent suggestion that appears inline as you type. Here's how it works:

1. Create a new file called `utils.js`.
2. Start typing a function signature:

```javascript
// Calculate the factorial of a number
function factorial(n) {
```

3. Pause for a moment — Copilot will display a ghost-text suggestion to complete the function.

**Accepting and rejecting suggestions:**

| Action | Shortcut |
|--------|----------|
| Accept full suggestion | `Tab` |
| Dismiss suggestion | `Esc` |
| See next suggestion | `Alt+]` |
| See previous suggestion | `Alt+[` |
| Accept word-by-word | `Ctrl+Right Arrow` |

> 💡 **Tip:** You don't have to accept the entire suggestion. Use `Ctrl+Right Arrow` to accept one word at a time for more control.

## Step 3: Your First Copilot-Assisted Function

Let's write a utility function. Create a file called `stringHelpers.js` and type:

```javascript
/**
 * Reverse a string without using the built-in reverse method.
 * @param {string} str - The input string
 * @returns {string} The reversed string
 */
function reverseString(str) {
```

Copilot should suggest a loop-based implementation. Accept it with `Tab`, then verify:

```javascript
function reverseString(str) {
  let reversed = "";
  for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
  }
  return reversed;
}
```

> 🔑 **Key insight:** Descriptive comments and JSDoc annotations give Copilot more context, resulting in better suggestions.

## Step 4: Using Copilot Chat for Explanations

Copilot Chat is your conversational AI assistant inside VS Code. Open it with `Ctrl+Shift+I` or click the chat icon in the sidebar.

Try these prompts:

**Explain code:**
```
What does this regular expression do? /^(?=.*[A-Z])(?=.*\d).{8,}$/
```

**Generate code from a description:**
```
Write a function that debounces another function with a configurable delay
```

**Debug an error:**
```
I'm getting "TypeError: Cannot read properties of undefined (reading 'map')". What could cause this?
```

## Step 5: Debugging with Copilot

When you hit an error, Copilot can help you understand and fix it. Try this broken code:

```javascript
const users = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];

// Bug: 'filter' is misspelled
const adults = users.fliter((u) => u.age >= 18);
console.log(adults);
```

Select the code, open Copilot Chat, and ask:

```
/fix Why is this code throwing a TypeError?
```

Copilot will identify the typo (`fliter` → `filter`) and provide the corrected version.

## Step 6: Daily Workflow Tips

Here are practical patterns to integrate Copilot into your everyday coding:

### Write comments first, code second

```javascript
// Sort an array of objects by a given key in ascending order
// Handle missing keys by placing those items at the end
function sortByKey(arr, key) {
  // Copilot fills in the implementation
```

### Let Copilot write your boilerplate

```python
# Create a Flask route that accepts GET and POST requests
# GET returns all items, POST creates a new item
# Validate the request body has 'name' and 'price' fields
```

### Use Copilot for repetitive transformations

```javascript
const statusCodes = {
  200: "OK",
  201: "Created",
  // Start typing the next one — Copilot will suggest the rest
```

## 🎯 Hands-On Exercise: Build a REST API Endpoint

Put it all together by building a simple Express API with Copilot's help.

### Setup

```bash
mkdir copilot-api-demo && cd copilot-api-demo
npm init -y
npm install express
```

### Create `server.js`

Start with this comment and let Copilot help you build the rest:

```javascript
// Express REST API for managing a todo list
// Endpoints:
//   GET  /todos       - List all todos
//   POST /todos       - Create a new todo (body: { title, completed })
//   PUT  /todos/:id   - Update a todo by ID
//   DELETE /todos/:id - Delete a todo by ID
// Store todos in-memory as an array

const express = require("express");
const app = express();
app.use(express.json());

let todos = [];
let nextId = 1;

// GET /todos - return all todos
app.get("/todos", (req, res) => {
  res.json(todos);
});

// POST /todos - create a new todo
// Let Copilot generate this handler from the comment above
```

Type each comment block, pause, and accept Copilot's suggestion. You should end up with a fully working CRUD API in under 5 minutes.

### Test it

```bash
node server.js &
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Copilot", "completed": false}'
curl http://localhost:3000/todos
```

## 🎯 What You Learned

- How to install and configure GitHub Copilot in VS Code
- How ghost-text suggestions work and how to accept/reject them
- Writing functions with AI-assisted completions
- Using Copilot Chat for explanations, generation, and debugging
- Practical daily workflow patterns
- Building a REST API endpoint with Copilot assistance

## 📚 Glossary

- **Ghost text**: Semi-transparent inline code suggestions from Copilot
- **Copilot Chat**: Conversational AI interface in VS Code for Q&A and code generation
- **Code completions**: AI-generated suggestions that appear as you type
- **Prompt engineering**: Writing comments and context to guide Copilot's suggestions

## ➡️ Next Steps

Ready to level up? Continue to the intermediate course:
- 🟡 [Copilot-Driven Development: Real-World Workflows](/Learn-GHCP/courses/persona/developer-intermediate/)
