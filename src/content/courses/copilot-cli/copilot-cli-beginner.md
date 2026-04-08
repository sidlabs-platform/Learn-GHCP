---
title: "Your First Copilot CLI Session"
description: "Install GitHub Copilot CLI, run your first interactive prompt, and learn the basic slash commands."
track: "copilot-cli"
difficulty: "beginner"
featureRefs:
  - copilot-cli
personaTags:
  - developer
  - student
technologyTags:
  - terminal
  - cli
estimatedMinutes: 15
lastGenerated: 2026-04-08
published: true
---

# 🟢 Your First Copilot CLI Session

Welcome! In this beginner course you'll install GitHub Copilot CLI, authenticate with your GitHub account, and have your first AI-powered conversation right in the terminal. By the end you'll be comfortable navigating the interactive session, using slash commands, and pointing Copilot at your own files for context-aware assistance.

## Prerequisites

Before you begin, verify that you have the following:

| Requirement | Verification Command | Expected Output |
|-------------|---------------------|-----------------|
| GitHub account with **Copilot access** | Visit [github.com/settings/copilot](https://github.com/settings/copilot) | Shows your Copilot subscription status |
| **Node.js 20+** | `node --version` | `v20.x.x` or higher |
| **npm** (ships with Node.js) | `npm --version` | `10.x.x` or higher |
| A terminal application | — | macOS Terminal, Windows Terminal, iTerm2, or any Linux shell |
| **Git** installed | `git --version` | `git version 2.x.x` |

> 💡 **Tip:** If `node --version` returns nothing, install Node.js from [nodejs.org](https://nodejs.org). The LTS version is recommended.

## What Is Copilot CLI?

GitHub Copilot CLI is a **terminal-native AI assistant**. Unlike Copilot in your editor, it runs entirely in your shell — no IDE required. You type natural-language prompts, and it responds with explanations, code, shell commands, and even multi-file edits.

### How It Differs from Other Copilot Surfaces

| Surface | Where It Runs | Primary Strength | Input Style |
|---------|--------------|-------------------|-------------|
| **Copilot CLI** | Terminal / shell | Shell commands, scripting, file operations, git workflows | Natural language prompts in a REPL |
| **Copilot Chat (VS Code)** | VS Code sidebar | Code explanations, inline edits, test generation | Chat panel alongside code |
| **Copilot Inline Suggestions** | Editor buffer | Line-by-line autocomplete as you type | Accept/reject ghost text |
| **Copilot Chat (GitHub.com)** | Browser | Repository Q&A, PR summaries, issue triage | Web chat interface |

Copilot CLI shines when you're already in the terminal — navigating repos, running builds, debugging test failures, or automating tasks with shell scripts.

## Step 1: Install Copilot CLI

### macOS / Linux

```bash
npm install -g @githubnext/github-copilot-cli
```

If you see a permissions error:

```bash
sudo npm install -g @githubnext/github-copilot-cli
```

### Windows

Open **Windows Terminal** or **PowerShell** as Administrator:

```powershell
npm install -g @githubnext/github-copilot-cli
```

> ⚠️ **Windows Users:** If you use Git Bash, ensure `npm` is on your PATH. Run `where npm` to verify.

### Verify Installation

After installation, confirm the CLI is available:

```bash
ghcp --version
```

You should see a version number printed to the terminal. If the command is not found, close and reopen your terminal so the PATH picks up the new binary.

## Step 2: Authenticate with GitHub

Run the authentication command:

```bash
ghcp auth
```

The CLI will present a **device code** and open your browser to [github.com/login/device](https://github.com/login/device). The flow works like this:

```
Terminal                              Browser
  │                                      │
  │  1. Displays a one-time code         │
  │     (e.g. ABCD-1234)                 │
  │                                      │
  │  2. Opens browser ──────────────────▶│  3. Paste the code
  │                                      │  4. Authorize "GitHub Copilot CLI"
  │  5. "Authentication successful" ◀────│
  │                                      │
```

Once the browser shows "Congratulations", return to your terminal. You should see a confirmation message indicating you are logged in.

> 💡 **Tip:** Your token is cached locally. You won't need to re-authenticate every session unless the token expires or you run `ghcp auth --logout`.

## Step 3: Start Your First Interactive Session

Launch an interactive session inside any project directory:

```bash
cd ~/my-project   # navigate to any project you'd like to explore
ghcp
```

You should see a prompt (`>`) waiting for your input.

### Trusting a Directory

On the first launch in a new directory, Copilot CLI may ask you to **trust the folder**. This is a safety measure — the CLI needs permission before it can read files or execute commands in that directory.

- Select **Yes** to trust the current workspace.
- If you select No, the CLI will still work but cannot access local files or run shell commands.

### Approving Tool Actions

When Copilot wants to read a file, run a command, or edit code, it asks for your approval before proceeding. You'll see prompts like:

```
Copilot wants to run: cat package.json
Allow? (y/n)
```

> ⚠️ **Safety First:** Always read what Copilot is requesting before approving. Don't approve actions you don't understand — especially destructive commands like `rm` or database writes.

## Step 4: Have Your First Conversation

Try these example prompts one at a time. After each, observe what Copilot returns.

### Prompt 1 — Explain a command

```
What does the command `git rebase -i HEAD~3` do?
```

**What good output looks like:** A clear explanation of interactive rebase, what `HEAD~3` means, and what options you'll see in the editor (pick, squash, reword, etc.).

### Prompt 2 — Generate a command

```
How do I find all TypeScript files larger than 100KB in this project?
```

**What good output looks like:** A `find` or `Get-ChildItem` command appropriate for your OS, with an explanation of each flag.

### Prompt 3 — Summarize a file

```
Summarize the purpose of package.json
```

**What good output looks like:** Copilot reads your `package.json` (with your approval) and summarizes the project name, dependencies, and available scripts.

### Prompt 4 — Debug an error

```
I'm getting "EADDRINUSE: address already in use :::3000". How do I fix it?
```

**What good output looks like:** Copilot explains that port 3000 is in use, shows how to find the process (`lsof -i :3000` or `netstat`), and how to kill it.

## Step 5: Core Slash Commands

Slash commands control the CLI session itself — they are not sent to the AI model. Type them directly at the prompt.

| Command | What It Does | Example |
|---------|-------------|---------|
| `/help` | List all available commands and usage hints | `/help` |
| `/clear` | Clear the conversation history and start fresh | `/clear` |
| `/model` | Show or switch the active AI model | `/model gpt-4o` |
| `/compact` | Condense the conversation to save context window space | `/compact` |
| `/exit` | End the interactive session | `/exit` |

### Model Switching

The `/model` command is especially useful when you want to try a different AI model:

```
/model
```

This shows the currently active model. To switch:

```
/model claude-sonnet
```

> 💡 **Tip:** Different models have different strengths. Experiment to see which gives you the best results for your workflow.

## Step 6: Keyboard Shortcuts

These shortcuts work inside the interactive session:

| Shortcut | Action |
|----------|--------|
| `↑` / `↓` | Scroll through previous prompts (history) |
| `Tab` | Accept an inline suggestion or autocomplete |
| `Ctrl + C` | Cancel the current generation |
| `Ctrl + D` | Exit the session (same as `/exit`) |
| `Ctrl + L` | Clear the screen (keeps conversation history) |

## Step 7: Working with Files and Context

Copilot CLI can read files in your project to give context-aware answers. There are several ways to reference files:

### Referencing a Specific File

Use the `@` symbol followed by a file path to include a file in your prompt:

```
@src/index.ts — Explain what the main function does
```

Copilot reads the referenced file and uses its contents when generating a response.

### Referencing Multiple Files

You can reference several files in a single prompt:

```
@src/routes/users.ts @src/models/user.ts — How do these two files work together?
```

### Pointing at a Directory

```
@src/utils/ — List all the helper functions in this directory
```

> 💡 **Tip:** The more relevant context you provide, the better Copilot's responses will be. But don't overload — too many large files can fill the context window.

### Context Window Basics

Every AI model has a **context window** — a limit on how much text it can consider at once. If you hit the limit, older parts of the conversation are dropped. Use `/compact` to condense the conversation and reclaim space.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ghcp: command not found` | CLI not on PATH | Close and reopen terminal, or check `npm list -g` |
| `npm ERR! EACCES` during install | Insufficient permissions | Use `sudo` on macOS/Linux, or run terminal as Admin on Windows |
| Authentication fails | Token expired or Copilot not enabled | Visit [github.com/settings/copilot](https://github.com/settings/copilot) to check status |
| "Context window full" warning | Conversation too long | Run `/compact` or `/clear` and start fresh |
| Copilot won't read files | Directory not trusted | Re-launch `ghcp` and accept the trust prompt |
| Slow responses | Network issues or model overload | Check internet connection; try `/model` to switch models |
| "No MCP servers configured" | Expected if you haven't set up MCP yet | Ignore for now — you'll learn about MCP in later courses |

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Copilot CLI** | A terminal-based AI assistant by GitHub that runs in your shell |
| **Interactive session** | A live REPL conversation with the AI in your terminal |
| **Slash command** | A `/`-prefixed command that controls the CLI session (not sent to the AI) |
| **Context window** | The maximum amount of text the AI model can consider at once |
| **Device code flow** | An authentication method where you enter a code in your browser to authorize a CLI tool |
| **Trust prompt** | A security dialog asking permission to access files in a directory |
| **Tool approval** | A prompt asking you to confirm before Copilot executes a command or reads a file |
| **Model** | The AI model powering responses (e.g., GPT-4o, Claude Sonnet) |
| **REPL** | Read-Eval-Print Loop — an interactive prompt that reads input, processes it, and prints output |

## 🎯 What You Learned

- What Copilot CLI is and how it differs from other Copilot surfaces
- How to install the CLI on macOS, Windows, and Linux
- How to authenticate using the device code flow
- How to trust a directory and approve tool actions safely
- How to have a productive conversation with example prompts
- The core slash commands: `/help`, `/clear`, `/model`, `/compact`, `/exit`
- How to reference files with `@` for context-aware responses
- How to troubleshoot common installation and session issues

## ➡️ Next Steps

Ready to go deeper? Continue to the intermediate course:
- 🟡 [Build a Multi-Step Workflow with Plan Mode](/Learn-GHCP/courses/copilot-cli/copilot-cli-intermediate/)
