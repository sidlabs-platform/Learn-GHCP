---
title: "Introduction to Copilot CLI Plugins"
description: "Understand what CLI plugins are, browse available plugins, and install your first extension to customize your Copilot CLI experience."
track: "plugins"
difficulty: "beginner"
featureRefs:
  - cli-plugins
personaTags:
  - developer
technologyTags:
  - cli
  - github
  - copilot
estimatedMinutes: 15
lastGenerated: 2026-04-08
published: true
---

# 🟢 Introduction to Copilot CLI Plugins

Welcome! In this course you'll learn what Copilot CLI plugins are, explore the plugin ecosystem, install your first extension, and verify it's working correctly.

## Prerequisites

- A GitHub account with Copilot access
- GitHub Copilot CLI installed and authenticated (`ghcp` command available)
- Node.js 20+ installed

> 💡 If you haven't set up the CLI yet, complete the [Your First Copilot CLI Session](/Learn-GHCP/courses/copilot-cli/copilot-cli-beginner/) course first.

## What Are Copilot CLI Plugins?

Copilot CLI **plugins** (also called **extensions**) are add-ons that give the CLI new capabilities. They can:

- Add custom **tools** the AI agent can invoke (e.g., query a database, lint code)
- Introduce new **slash commands** for interactive sessions
- Connect to **MCP servers** that expose external services
- Run **lifecycle hooks** before or after agent actions

Think of plugins as the app-store for your terminal AI — they let you tailor Copilot to your exact workflow.

### Plugin vs. Extension — What's the Difference?

| Term | Scope | Location |
|------|-------|----------|
| **Extension** | Project-scoped add-on living in `.github/extensions/` | Repository |
| **User Extension** | Personal add-on stored in your user extensions directory | Local machine |
| **MCP Server** | External process that exposes tools via the Model Context Protocol | Anywhere (local/remote) |
| **Plugin** | General term covering all of the above | — |

Throughout this course we use "plugin" as the umbrella term and call out the specific type when it matters.

## The Plugin Ecosystem

Copilot CLI discovers plugins from three sources, checked in order:

```
1.  Project extensions   →  .github/extensions/*.md
2.  User extensions      →  ~/.copilot/extensions/*.md
3.  MCP servers          →  .vscode/mcp.json or ~/.copilot/mcp-config.json
```

You can list every plugin currently loaded in a session:

```bash
ghcp
```

Then, inside the interactive session:

```
/extensions
```

**Expected output (example):**

```
Loaded extensions:
  • code-reviewer   (project)   .github/extensions/code-reviewer.md
  • my-helper       (user)      ~/.copilot/extensions/my-helper.md

MCP servers:
  • github          (built-in)  running
```

## Step 1: Browse Available Extensions

Before installing anything, explore what's already out there. The `extensions_manage` command inside a Copilot CLI session can list and inspect extensions:

```
/extensions list
```

You can also inspect a specific extension for details:

```
/extensions inspect code-reviewer
```

This shows the extension's description, the tools it registers, and which agent types can use it.

## Step 2: Install Your First Extension

Let's install a simple **commit-message-helper** extension that generates conventional-commit messages from staged changes.

### 2a. Create the extension file

Create the file `.github/extensions/commit-helper.md` in your project:

```bash
mkdir -p .github/extensions
```

```markdown
<!-- .github/extensions/commit-helper.md -->
---
name: commit-helper
description: Generate conventional-commit messages from staged Git changes.
tools:
  - name: generate_commit_msg
    description: >
      Analyze staged changes with `git diff --cached` and produce a
      conventional-commit message (type: subject + body).
---

# Commit Helper

You are an expert at writing concise, conventional-commit messages.

When the user asks you to generate a commit message:
1. Run `git diff --cached --stat` to see which files changed.
2. Run `git diff --cached` to read the actual diff.
3. Produce a message in the format:
   ```
   type(scope): subject

   body
   ```
   Where `type` is one of: feat, fix, docs, style, refactor, test, chore.
```

### 2b. Reload extensions

Back in your Copilot CLI session, reload so the new extension is picked up:

```
/extensions reload
```

**Expected output:**

```
Reloaded extensions. 1 new extension found: commit-helper
```

## Step 3: Verify It Works

Stage some changes and ask Copilot to use the new extension:

```bash
git add -A
```

Then in the CLI session:

```
Generate a commit message for my staged changes
```

Copilot should invoke the `generate_commit_msg` tool, inspect your diff, and return a well-formed commit message.

> 💡 **Tip:** If the extension doesn't appear, make sure the file is saved under `.github/extensions/` and ends with `.md`.

## Step 4: Understand Extension File Anatomy

Every extension file has two parts:

```
┌─────────────────────────────┐
│  YAML Frontmatter           │  ← metadata (name, description, tools)
├─────────────────────────────┤
│  Markdown Body              │  ← system prompt & instructions
└─────────────────────────────┘
```

| Frontmatter Field | Required | Purpose |
|-------------------|----------|---------|
| `name` | Yes | Unique identifier for the extension |
| `description` | Yes | Short summary shown in `/extensions list` |
| `tools` | No | Array of tool definitions the extension provides |
| `tools[].name` | Yes | Tool name the agent can invoke |
| `tools[].description` | Yes | Tells the AI when/how to use the tool |

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Extension not listed after reload | File not in `.github/extensions/` | Move the file to the correct directory |
| Extension listed but never invoked | Tool `description` is too vague | Make the description specific so the AI knows when to call it |
| "YAML parse error" on reload | Invalid frontmatter | Check for mismatched quotes or bad indentation |
| Extension works locally but not for teammates | File not committed | `git add .github/extensions/` and push |

## 🎯 What You Learned

- The difference between extensions, user extensions, and MCP servers
- How Copilot CLI discovers and loads plugins
- How to create, install, and reload a project-scoped extension
- The anatomy of an extension file (frontmatter + markdown body)

## 📚 Glossary

- **Plugin** — General term for any Copilot CLI add-on (extension, MCP server, etc.)
- **Extension** — A Markdown file that gives the CLI new instructions and tools
- **MCP (Model Context Protocol)** — An open protocol for connecting AI models to external tools
- **Tool** — A callable function the AI agent can invoke during a session
- **Slash command** — A `/`-prefixed command used in interactive CLI sessions

## ➡️ Next Steps

Ready to build your own extension from scratch? Continue to the intermediate course:
- 🟡 [Build a Project-Scoped CLI Extension](/Learn-GHCP/courses/plugins/cli-plugins-intermediate/)
