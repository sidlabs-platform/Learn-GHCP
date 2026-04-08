---
title: "Build a Project-Scoped CLI Extension"
description: "Create a custom Copilot CLI extension scoped to your project with hot-reload, custom commands, and team sharing."
track: "plugins"
difficulty: "intermediate"
featureRefs:
  - cli-plugins
personaTags:
  - developer
technologyTags:
  - cli
  - nodejs
  - typescript
prerequisites:
  - cli-plugins-beginner
estimatedMinutes: 35
lastGenerated: 2026-04-08
published: true
---

# 🟡 Build a Project-Scoped CLI Extension

In this course you'll build a real-world Copilot CLI extension from scratch — a **code-quality checker** that your entire team can use. You'll learn extension file structure, hot-reload development, custom tool registration, testing, and sharing via Git.

## Scenario

Your team has agreed on a set of coding standards (max file length, required JSDoc on exports, no `console.log` in production code). Today, each developer runs different linters locally. You want to give everyone a single command inside Copilot CLI that checks these rules and explains violations in plain English.

## Prerequisites

- Completed the [Introduction to Copilot CLI Plugins](/Learn-GHCP/courses/plugins/cli-plugins-beginner/) course
- A Git repository with at least a few TypeScript/JavaScript files
- Copilot CLI running (`ghcp`)

## Extension File Structure

A project-scoped extension lives in `.github/extensions/` at the root of your repository. Here's the full structure you'll create:

```
your-repo/
├── .github/
│   └── extensions/
│       └── code-quality.md      ← the extension file
├── scripts/
│   └── lint-rules.ts            ← helper script (optional)
├── src/
│   └── ...
└── package.json
```

> 💡 Extensions are **single Markdown files** — no build step required. The Copilot CLI parses the YAML frontmatter for metadata and feeds the Markdown body as the system prompt.

## Step 1: Scaffold the Extension

Use the built-in scaffold command to generate a skeleton:

```
/extensions scaffold code-quality
```

This creates `.github/extensions/code-quality.md` with boilerplate content. Open the file and replace its contents with the following:

```markdown
---
name: code-quality
description: >
  Analyze source files against the team's coding standards and report
  violations with clear explanations and suggested fixes.
tools:
  - name: check_file_length
    description: >
      Check whether a file exceeds the team maximum of 300 lines.
      Run `wc -l <path>` (or PowerShell equivalent) and report the result.
  - name: check_no_console_log
    description: >
      Search a file for `console.log` statements that should not
      appear in production code. Use `grep -n 'console\.log' <path>`.
  - name: check_jsdoc_exports
    description: >
      Verify that every exported function or class in a TypeScript
      file has a JSDoc comment. Parse the file and list any exports
      missing documentation.
---

# Code Quality Checker

You are a strict but helpful code reviewer. When the user asks you
to check code quality, run **all three tools** on the requested
file(s) and produce a unified report.

## Report Format

Return results as a Markdown table:

| File | Rule | Status | Details |
|------|------|--------|---------|
| src/utils.ts | File length ≤ 300 | ✅ Pass | 142 lines |
| src/utils.ts | No console.log | ❌ Fail | Lines 34, 78 |
| src/utils.ts | JSDoc on exports | ⚠️ Warn | `formatDate` missing JSDoc |

After the table, provide a **Summary** section with:
1. Total files checked
2. Pass / Fail / Warning counts
3. Suggested fixes for every failure, with code snippets
```

## Step 2: Enable Hot-Reload for Development

While developing your extension, you want changes to take effect immediately without restarting the CLI.

Copilot CLI supports hot-reload by watching the extensions directory. After saving a change to your `.md` file, simply run:

```
/extensions reload
```

The CLI re-reads all extension files from disk and applies changes within the current session.

### Development workflow loop

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│ Edit .md file │ ──▶ │ /extensions reload │ ──▶ │ Test in CLI  │
└──────────────┘     └───────────────────┘     └──────┬───────┘
       ▲                                              │
       └──────────────── iterate ◀────────────────────┘
```

> 💡 **Tip:** Keep a split terminal — your editor on one side and the CLI session on the other.

## Step 3: Register Custom Tools

Each tool in the `tools` array tells the AI agent *what it can do* and *when to do it*. The agent translates that into shell commands at runtime.

### Anatomy of a tool definition

```yaml
tools:
  - name: check_file_length          # unique, snake_case
    description: >                    # natural-language instruction
      Check whether a file exceeds the team maximum of 300 lines.
      Run `wc -l <path>` (or PowerShell equivalent) and report.
```

**Key rules for tool descriptions:**

| Do | Don't |
|----|-------|
| Be specific about the command to run | Leave the implementation vague |
| State the success/failure criteria | Assume the AI knows your rules |
| Mention both Unix and Windows commands | Assume one OS only |
| Keep each tool focused on one task | Combine multiple checks in one tool |

### Adding a fourth tool

Let's add a rule that checks for `TODO` comments older than 30 days (using Git blame):

```yaml
  - name: check_stale_todos
    description: >
      Find TODO comments in a file using `grep -n 'TODO' <path>`, then
      run `git blame -L <line>,<line> <path>` for each match to get the
      commit date. Report any TODOs older than 30 days as warnings.
```

Add this entry to the `tools` array in your extension file and reload.

## Step 4: Test the Extension

### Manual testing

In your CLI session, target a specific file:

```
Check code quality for src/index.ts
```

Copilot invokes each tool, collects results, and renders the unified table.

### Testing edge cases

Try these scenarios to ensure robustness:

| Test Case | Command | Expected Behaviour |
|-----------|---------|-------------------|
| Clean file | `Check code quality for src/constants.ts` | All rules pass |
| Long file | `Check code quality for src/legacy-module.ts` | File-length rule fails |
| Glob pattern | `Check code quality for src/**/*.ts` | Multiple files reported |
| Non-existent file | `Check code quality for src/nope.ts` | Graceful error message |
| Binary file | `Check code quality for logo.png` | Skipped with explanation |

### Validating tool invocation

To confirm which tools the agent called, enable verbose mode:

```
/verbose on
```

Then re-run your check. You'll see each tool call and its output in the session log.

## Step 5: Share with Your Team via Git

Project-scoped extensions live inside the repository, so sharing is a `git push` away.

```bash
git add .github/extensions/code-quality.md
git commit -m "feat(extensions): add code-quality checker extension

Adds a project-scoped Copilot CLI extension that checks:
- File length (max 300 lines)
- No console.log in production code
- JSDoc on exported functions
- Stale TODO comments (>30 days)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push
```

Once pushed, any teammate who pulls the branch gets the extension automatically — no install step.

### Team onboarding checklist

Share this with your team so they can start using the extension:

1. Pull the latest changes: `git pull`
2. Open a Copilot CLI session: `ghcp`
3. Verify the extension loaded: `/extensions list`
4. Run a check: `Check code quality for src/index.ts`

## 🏋️ Extension Challenge

Build a **dependency-audit** extension that:

1. Reads `package.json` to list production dependencies
2. Checks each dependency for known vulnerabilities using `npm audit --json`
3. Reports a summary table of vulnerable packages with severity levels
4. Suggests upgrade commands for each vulnerable package

**Bonus:** Make it work for both `npm` and `yarn` by detecting the lock file.

<details>
<summary>Hint: Tool definitions</summary>

```yaml
tools:
  - name: read_dependencies
    description: >
      Read the `dependencies` object from package.json at the project
      root and return a JSON list of package names and versions.
  - name: run_audit
    description: >
      Run `npm audit --json` and parse the output. Return a structured
      list of advisories with package name, severity, and fix command.
  - name: detect_package_manager
    description: >
      Check for the existence of yarn.lock, pnpm-lock.yaml, or
      package-lock.json to determine which package manager to use.
```

</details>

## 🎯 What You Learned

- How to scaffold and structure a project-scoped extension
- The hot-reload development workflow for rapid iteration
- How to register multiple custom tools with clear descriptions
- Testing strategies including edge cases and verbose mode
- How to share extensions with your team through Git

## ➡️ Navigation

- ⬅️ [Introduction to Copilot CLI Plugins](/Learn-GHCP/courses/plugins/cli-plugins-beginner/) (beginner)
- ➡️ [Build a Full Agent Plugin Bundle](/Learn-GHCP/courses/plugins/cli-plugins-advanced/) (advanced)
