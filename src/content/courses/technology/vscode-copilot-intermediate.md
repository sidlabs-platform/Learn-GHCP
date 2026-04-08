---
title: "VS Code Power User: Copilot Workflows and Customization"
description: "Customize Copilot in VS Code with keybindings, instruction files, multi-cursor patterns, and workspace-aware AI assistance."
track: "technology"
difficulty: "intermediate"
featureRefs: [copilot-chat, inline-chat, agent-mode, code-completions]
personaTags: [developer]
technologyTags: [vscode, copilot, configuration]
prerequisites: [vscode-copilot-beginner]
estimatedMinutes: 35
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n, Tip } from "@components/course";

## Elevate Your Copilot Workflow

You know how to accept suggestions and use Chat. Now it is time to make Copilot work the way you work. This course covers custom keybindings, instruction files that shape Copilot's behavior, multi-cursor patterns, agent mode for multi-file edits, terminal integration, notebook support, and complementary extensions.

### What You Will Learn

- Customize keybindings for faster Copilot interaction
- Configure `settings.json` for project-specific behavior
- Write workspace instruction files to guide Copilot output
- Combine multi-cursor editing with AI completions
- Use agent mode for multi-file automated edits
- Leverage Copilot in the integrated terminal
- Work with Copilot inside Jupyter notebooks
- Pair Copilot with complementary extensions

---

## Section 1 — Custom Keybindings

### Viewing Current Bindings

Open the Keyboard Shortcuts editor with `Ctrl+K Ctrl+S`. Filter by **copilot** to see every Copilot-related binding.

### Recommended Custom Bindings

Add these to `keybindings.json` (`Ctrl+Shift+P` → **Preferences: Open Keyboard Shortcuts (JSON)**):

```json
[
  {
    "key": "ctrl+shift+a",
    "command": "editor.action.inlineSuggest.trigger",
    "when": "editorTextFocus && !inlineSuggestVisible"
  },
  {
    "key": "alt+enter",
    "command": "github.copilot.openCompletionPanel",
    "when": "editorTextFocus"
  },
  {
    "key": "ctrl+shift+/",
    "command": "workbench.action.chat.open"
  },
  {
    "key": "ctrl+alt+d",
    "command": "github.copilot.interactiveEditor.generateDocs",
    "when": "editorHasSelection"
  }
]
```

### Binding Strategy

| Goal | Suggested Binding | Command |
|---|---|---|
| Manually trigger suggestion | `Ctrl+Shift+A` | `editor.action.inlineSuggest.trigger` |
| Open completions panel | `Alt+Enter` | `github.copilot.openCompletionPanel` |
| Focus Chat panel | `Ctrl+Shift+/` | `workbench.action.chat.open` |
| Generate docs for selection | `Ctrl+Alt+D` | `github.copilot.interactiveEditor.generateDocs` |

---

## Section 2 — Settings Configuration

### Project-Level Settings

Create `.vscode/settings.json` in your project root to configure Copilot per workspace:

```json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "json": false
  },
  "github.copilot.editor.enableAutoCompletions": true,
  "chat.editor.fontSize": 14,
  "chat.editor.wordWrap": "on"
}
```

### Useful Global Settings

```json
{
  "editor.inlineSuggest.enabled": true,
  "editor.inlineSuggest.showToolbar": "onHover",
  "github.copilot.chat.localeOverride": "en",
  "github.copilot.chat.scopeSelection": true
}
```

### Per-Language Overrides

Enable or disable Copilot for specific languages:

```json
{
  "[python]": {
    "editor.inlineSuggest.enabled": true
  },
  "[markdown]": {
    "editor.inlineSuggest.enabled": false
  }
}
```

---

## Section 3 — Workspace Instruction Files

Instruction files let you define project conventions that Copilot follows when generating code.

### Creating an Instruction File

Create `.github/copilot-instructions.md` in your repository root:

```markdown
# Copilot Instructions for This Project

## Code Style
- Use TypeScript strict mode with explicit return types on all functions.
- Prefer `const` over `let`. Never use `var`.
- Use named exports, not default exports.

## Architecture
- Follow the repository pattern for data access.
- All API handlers go in `src/handlers/`.
- All database queries go in `src/repositories/`.

## Testing
- Use Vitest for all unit tests.
- Place test files next to source files with `.test.ts` suffix.
- Aim for 80% branch coverage minimum.

## Naming
- Use camelCase for variables and functions.
- Use PascalCase for types, interfaces, and classes.
- Prefix interfaces with `I` only when required by existing codebase.
```

### How Instructions Affect Output

When you ask Copilot to generate a new API handler, it reads these instructions and:

1. Uses TypeScript with strict mode and explicit return types.
2. Places the file in `src/handlers/`.
3. Imports from `src/repositories/` for data access.
4. Generates a corresponding `.test.ts` file using Vitest.

### Scoped Instructions

You can also create `.github/copilot-instructions.md` files in subdirectories for scoped rules that override the root instructions for that folder.

---

## Section 4 — Multi-Cursor + Copilot Patterns

Multi-cursor editing combined with Copilot produces powerful batch transformations.

### Pattern: Generating Multiple Implementations

1. Write a list of function signatures using multi-cursor (`Alt+Click` to place cursors):

```typescript
function validateEmail(email: string): boolean {
function validatePhone(phone: string): boolean {
function validateZipCode(zip: string): boolean {
```

2. Place your cursor at the end of the first function body brace.
3. Copilot suggests the implementation. Accept with `Tab`.
4. Move to the next function — Copilot uses the pattern from the first to generate consistent implementations.

### Pattern: Batch Rename with AI Context

1. Select all instances of a variable with `Ctrl+Shift+L`.
2. Copilot understands the multi-cursor context and adjusts suggestions to match the new name consistently.

### Pattern: Parallel Comment-Driven Generation

```typescript
// validate that the string is a valid IPv4 address
// validate that the string is a valid IPv6 address
// validate that the string is a valid MAC address
```

Place a cursor at the end of each comment line, press `Enter`, and Copilot generates each function body in sequence.

---

## Section 5 — Agent Mode for Multi-File Edits

Agent mode allows Copilot to plan and execute changes across multiple files autonomously.

### Activating Agent Mode

1. Open the Chat panel.
2. Select **Agent** from the mode dropdown at the top of the panel.
3. Describe the task in natural language.

### What Agent Mode Can Do

| Capability | Example |
|---|---|
| Create new files | "Create a new Express router for user authentication" |
| Edit existing files | "Add input validation to all API handlers" |
| Run terminal commands | "Install the `zod` package and set up schema validation" |
| Iterate on errors | Automatically reads compiler errors and attempts fixes |

### Example: Adding a Feature Across Files

Prompt:

```text
Add a rate limiting middleware to the Express app.
Create the middleware in src/middleware/rateLimit.ts,
register it in src/app.ts, and add tests in
src/middleware/rateLimit.test.ts.
```

Agent mode will:

1. Create the rate limit middleware file.
2. Modify `src/app.ts` to import and register it.
3. Generate test cases in a new test file.
4. Run the tests and fix any failures.

### Best Practices for Agent Mode

- Be specific about file paths and structure.
- Review each proposed change before confirming.
- Use the **Undo** feature if a change is incorrect.
- Keep your instruction file updated — agent mode reads it too.

---

## Section 6 — Terminal Integration

Copilot assists in the integrated terminal with command suggestions and explanations.

### Using Copilot in the Terminal

Press `Ctrl+I` in the integrated terminal to open an inline prompt. Describe what you want to do:

```text
Find all TypeScript files modified in the last 7 days
```

Copilot suggests the appropriate shell command:

```bash
find . -name "*.ts" -mtime -7
```

### Terminal Chat Participant

Use `@terminal` in the Chat panel for terminal-focused help:

```text
@terminal How do I find and kill the process using port 3000?
```

### Command Explanation

Select a complex command in the terminal, right-click, and choose **Copilot: Explain This**. Copilot breaks down each flag and pipe in plain language.

---

## Section 7 — Copilot in Jupyter Notebooks

Copilot works inside `.ipynb` files with both ghost text and Chat.

### Completions in Code Cells

Type a comment or function signature in a code cell:

```python
# Load the CSV file and display the first 5 rows
```

Copilot suggests:

```python
import pandas as pd

df = pd.read_csv("data.csv")
df.head()
```

### Chat for Data Analysis

Use the Chat panel to ask data questions:

```text
@workspace Analyze the distribution of the 'age' column
and suggest appropriate visualizations.
```

### Markdown Cell Generation

In a markdown cell, type `# ` and a description. Copilot can suggest the full markdown content including formatted tables and LaTeX equations.

---

## Section 8 — Extension Recommendations

These extensions complement Copilot effectively:

| Extension | Purpose | How It Helps Copilot |
|---|---|---|
| **Error Lens** | Inline error display | Copilot sees errors in context |
| **GitLens** | Git blame and history | Provides commit context |
| **Prettier** | Code formatting | Formats Copilot output consistently |
| **ESLint** | Linting | Catches issues in generated code |
| **Todo Tree** | TODO tracking | Copilot can generate TODO items |
| **Thunder Client** | API testing | Test endpoints Copilot generates |

### Installing All Recommendations

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "GitHub.copilot",
    "GitHub.copilot-chat",
    "usernamehw.errorlens",
    "eamodio.gitlens",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

---

## Section 9 — Hands-On Exercise

<Hands0n title="Build a Custom Workflow">

### Goal

Configure a VS Code workspace that shapes Copilot behavior for a REST API project.

### Steps

1. **Create instruction file:** Write `.github/copilot-instructions.md` with rules for Express.js, TypeScript, and Vitest.
2. **Configure settings:** Set up `.vscode/settings.json` to disable Copilot for JSON and YAML files.
3. **Add keybindings:** Create at least three custom Copilot keybindings in your user `keybindings.json`.
4. **Use agent mode:** Ask agent mode to scaffold a new `GET /health` endpoint with middleware and tests.
5. **Terminal task:** Use Copilot in the terminal to generate the command for running only tests matching "health".

### Verification Checklist

- [ ] Instruction file exists and contains at least five rules
- [ ] Settings disable Copilot for non-code files
- [ ] Custom keybindings work correctly
- [ ] Agent mode created files in the correct locations
- [ ] Terminal command runs the correct test subset

</Hands0n>

---

## Summary

You customized Copilot with keybindings, workspace settings, and instruction files. You learned multi-cursor patterns, agent mode for multi-file edits, terminal integration, notebook support, and extension pairings. In the advanced course, you will build VS Code extensions that integrate directly with the Copilot API.
