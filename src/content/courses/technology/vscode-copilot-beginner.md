---
title: "Copilot in VS Code: Complete Setup Guide"
description: "Install, configure, and master GitHub Copilot in Visual Studio Code — from first suggestion to productive daily use."
track: "technology"
difficulty: "beginner"
featureRefs: [code-completions, copilot-chat, ghost-text, inline-chat]
personaTags: [developer, student]
technologyTags: [vscode, copilot]
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n, KeyboardShortcut } from "@components/course";

## Welcome to GitHub Copilot in VS Code

GitHub Copilot is an AI pair programmer that helps you write code faster and with less effort. In this course, you will install the Copilot extension, learn to work with ghost text suggestions, explore the Chat panel, and use inline chat — all inside Visual Studio Code.

By the end, you will have written a complete function using only Copilot suggestions.

### What You Will Learn

- Install and authenticate the GitHub Copilot extension
- Understand and accept ghost text suggestions
- Navigate alternative suggestions with keyboard shortcuts
- Use the Chat panel for conversational coding help
- Invoke inline chat for targeted code edits
- Configure essential Copilot settings
- Troubleshoot common issues

---

## Section 1 — Installing the Copilot Extension

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| Visual Studio Code | 1.90 or later |
| GitHub account | Free, Pro, or Enterprise |
| Copilot subscription | Individual, Business, or Enterprise |

### Step-by-Step Installation

<Step number={1}>
Open VS Code and press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS) to open the Extensions view.
</Step>

<Step number={2}>
Search for **GitHub Copilot** in the marketplace search bar. Install the extension published by **GitHub**.
</Step>

<Step number={3}>
After installation, VS Code displays a sign-in prompt in the bottom-right corner. Click **Sign in to GitHub** and complete the OAuth flow in your browser.
</Step>

<Step number={4}>
Return to VS Code. The Copilot icon appears in the status bar at the bottom of the window. A spinning icon means Copilot is initializing; a steady icon means it is ready.
</Step>

> **Tip:** Installing the **GitHub Copilot** extension also installs **GitHub Copilot Chat** automatically. You do not need to install them separately.

---

## Section 2 — Understanding Ghost Text Suggestions

Ghost text is the dimmed, inline suggestion that Copilot displays as you type. It predicts the next chunk of code based on your current file context, open tabs, and the broader model training.

### How Ghost Text Works

1. You start typing a function signature, comment, or variable name.
2. Copilot analyzes the surrounding code and sends context to the model.
3. A dimmed suggestion appears after your cursor.
4. You decide whether to accept, dismiss, or request alternatives.

### Accepting and Dismissing Suggestions

| Action | Windows / Linux | macOS |
|---|---|---|
| Accept full suggestion | `Tab` | `Tab` |
| Accept next word | `Ctrl+Right Arrow` | `Cmd+Right Arrow` |
| Dismiss suggestion | `Esc` | `Esc` |
| Next suggestion | `Alt+]` | `Option+]` |
| Previous suggestion | `Alt+[` | `Option+[` |
| Open completions panel | `Ctrl+Enter` | `Ctrl+Enter` |

### Example: Writing a Utility Function

Create a new file called `utils.js` and type the following comment:

```javascript
// function that converts a temperature from Fahrenheit to Celsius
```

After pressing `Enter`, Copilot typically suggests:

```javascript
function fahrenheitToCelsius(fahrenheit) {
  return (fahrenheit - 32) * 5 / 9;
}
```

Press `Tab` to accept. If the suggestion does not appear, wait a moment — network latency can cause a short delay.

### Viewing Alternative Suggestions

Press `Ctrl+Enter` to open the **Copilot Completions Panel**. This panel shows up to ten alternative suggestions side by side, each with an **Accept** button. Use this when the first suggestion is close but not exactly what you need.

---

## Section 3 — The Chat Panel

The Chat panel provides a conversational interface for asking Copilot questions, generating code, and getting explanations.

### Opening the Chat Panel

- Click the **Copilot Chat** icon in the Activity Bar (left sidebar).
- Or press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Shift+I` (macOS).

### What You Can Do in Chat

| Task | Example Prompt |
|---|---|
| Explain code | "Explain the `reduce` call on line 42" |
| Generate code | "Write a function to validate email addresses" |
| Fix errors | "Fix the TypeScript error in this file" |
| Write tests | "Generate Jest tests for the `UserService` class" |
| Refactor | "Refactor this to use async/await instead of callbacks" |

### Using Chat Participants

Chat participants scope Copilot's responses to a specific domain:

- **@workspace** — answers questions about your entire project
- **@vscode** — answers questions about VS Code settings and features
- **@terminal** — helps with shell commands and terminal workflows

```text
@workspace How is authentication handled in this project?
```

---

## Section 4 — Inline Chat

Inline chat lets you prompt Copilot directly in the editor without switching to the Chat panel.

### Activating Inline Chat

Place your cursor on a line or select a block of code, then press:

- **Windows / Linux:** `Ctrl+I`
- **macOS:** `Cmd+I`

A small input box appears inline. Type your instruction and press `Enter`.

### Common Inline Chat Commands

```text
/doc      — Generate documentation for the selected code
/explain  — Get a plain-language explanation
/fix      — Propose a fix for a problem
/tests    — Generate unit tests for the selection
```

### Example: Adding JSDoc to a Function

Select the following function:

```javascript
function calculateDiscount(price, discountPercent) {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error("Invalid discount percentage");
  }
  return price - (price * discountPercent) / 100;
}
```

Press `Ctrl+I`, type `/doc`, and press `Enter`. Copilot generates a JSDoc comment block with parameter and return descriptions.

---

## Section 5 — Essential Settings

Open settings with `Ctrl+,` and search for **copilot** to see all configurable options.

### Key Settings

| Setting | Description | Default |
|---|---|---|
| `github.copilot.enable` | Master toggle per language | `true` for all |
| `github.copilot.editor.enableAutoCompletions` | Show ghost text automatically | `true` |
| `editor.inlineSuggest.enabled` | Enable inline suggestions | `true` |

### Per-Language Configuration

Disable Copilot for specific languages in `settings.json`:

```json
{
  "github.copilot.enable": {
    "*": true,
    "markdown": false,
    "plaintext": false
  }
}
```

---

## Section 6 — Keyboard Shortcuts Reference

| Action | Windows / Linux | macOS |
|---|---|---|
| Accept suggestion | `Tab` | `Tab` |
| Dismiss suggestion | `Esc` | `Esc` |
| Next suggestion | `Alt+]` | `Option+]` |
| Previous suggestion | `Alt+[` | `Option+[` |
| Completions panel | `Ctrl+Enter` | `Ctrl+Enter` |
| Open Chat | `Ctrl+Shift+I` | `Cmd+Shift+I` |
| Inline Chat | `Ctrl+I` | `Cmd+I` |
| Quick Chat | `Ctrl+Shift+Alt+L` | `Cmd+Shift+Option+L` |

---

## Section 7 — Hands-On Exercise

<Hands0n title="Build a URL Shortener Module">

### Goal

Write a complete `urlShortener.js` module using only Copilot suggestions.

### Steps

1. Create a new file `urlShortener.js`.
2. Type the comment `// Map to store original URLs keyed by short code` and accept the suggestion.
3. Type `// function to generate a random short code of a given length` and let Copilot complete it.
4. Type `// function to shorten a URL and store the mapping` and accept.
5. Type `// function to resolve a short code back to the original URL` and accept.
6. Type `// function to list all stored URL mappings` and accept.

### Expected Outcome

You should have four working functions that Copilot generated based on your comments. Run the file with `node urlShortener.js` after adding a small test block at the bottom.

### Verification

```javascript
const short = shortenUrl("https://github.com/features/copilot");
console.log("Short code:", short);
console.log("Resolved:", resolveUrl(short));
console.log("All mappings:", listMappings());
```

</Hands0n>

---

## Section 8 — Troubleshooting

### Suggestions Not Appearing

1. **Check authentication:** Click the Copilot icon in the status bar. If it says "Sign in," complete the OAuth flow.
2. **Check subscription:** Ensure your GitHub account has an active Copilot subscription.
3. **Check language:** Some languages may be disabled in settings. Verify `github.copilot.enable` for your file type.
4. **Network issues:** Copilot requires internet access. Check your proxy and firewall settings.
5. **Extension version:** Update to the latest version via the Extensions view.

### Chat Not Responding

- Ensure the **GitHub Copilot Chat** extension is installed and enabled.
- Reload the window with `Ctrl+Shift+P` → **Developer: Reload Window**.
- Check the Output panel (`Ctrl+Shift+U`) and select **GitHub Copilot Chat** for error logs.

### High Latency

- Close unused editor tabs to reduce the context window size.
- Disable extensions that may conflict (other AI completion extensions).
- If you are behind a corporate proxy, configure `http.proxy` in VS Code settings.

---

## Summary

You installed GitHub Copilot in VS Code, learned to accept and navigate ghost text suggestions, explored the Chat panel and inline chat, reviewed key settings, and built a module entirely with AI suggestions. In the next course, you will customize Copilot workflows with keybindings, instruction files, and agent mode.
