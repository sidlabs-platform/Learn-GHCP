---
title: "Getting Started with Copilot Workspace"
description: "Use Copilot Workspace to go from a GitHub Issue to a working pull request with AI-driven planning and implementation."
track: "technology"
difficulty: "beginner"
featureRefs:
  - copilot-agents
  - copilot-chat
personaTags:
  - developer
  - student
technologyTags:
  - github
  - copilot-workspace
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

# 🟢 Getting Started with Copilot Workspace

Welcome! In this course you'll learn how to use Copilot Workspace — GitHub's AI-powered development environment that takes you from a GitHub Issue to a working pull request through an interactive brainstorm → plan → implement flow.

## Prerequisites

- A GitHub account with access to **Copilot Workspace** (currently available with Copilot Enterprise and Copilot Pro+)
- A repository you own with at least a few source files
- Basic familiarity with GitHub Issues and Pull Requests

## What Is Copilot Workspace?

Copilot Workspace is an AI-native development environment built into GitHub. Instead of writing code line-by-line, you describe what you want to accomplish and Workspace generates a plan and implementation for you.

| Feature | Traditional Development | Copilot Workspace |
|---------|------------------------|-------------------|
| **Starting point** | Read the issue, think about the approach | Issue is analyzed automatically |
| **Planning** | Mental model or notes | AI generates a structured plan |
| **Implementation** | Write code manually | AI proposes code changes |
| **Review** | Self-review, then PR | Review AI changes, then PR |
| **Iteration** | Edit → save → test loop | Edit the plan, regenerate code |

Think of Workspace as a **structured AI pair-programming session** that starts with your intent and produces a reviewable set of changes.

## The Workspace Flow

Every Workspace session follows this pipeline:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Issue     │────▶│ 2. Brainstorm│────▶│  3. Plan     │────▶│ 4. Implement │
│  (your task)  │     │ (AI analyzes)│     │ (file changes)│    │ (code diffs) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                       │
                                                                       ▼
                                                               ┌──────────────┐
                                                               │  5. Create PR│
                                                               │ (your review)│
                                                               └──────────────┘
```

1. **Issue** — You start with a GitHub Issue describing what needs to change
2. **Brainstorm** — Workspace analyzes the issue and your codebase, generating a high-level summary of the task and proposed approach
3. **Plan** — Workspace creates a detailed plan listing specific files to create, modify, or delete, with descriptions of each change
4. **Implement** — Workspace generates the actual code changes as a diff you can review
5. **Create PR** — Once you're satisfied, create a pull request directly from Workspace

## Step 1: Open Workspace from an Issue

There are multiple ways to launch Copilot Workspace:

### From an Existing Issue

1. Navigate to any open issue in your repository
2. Click the **Open in Workspace** button (or the Copilot Workspace icon) next to the issue title
3. Workspace opens in a new tab with the issue pre-loaded

### From a New Task

1. Go to [copilot-workspace.githubnext.com](https://copilot-workspace.githubnext.com)
2. Select your repository
3. Describe your task in natural language — Workspace creates an ad-hoc session without needing an issue

> 💡 **Tip:** Starting from a well-written issue produces better results because Workspace uses the issue title, description, and any linked context as input.

## Step 2: Understanding the Brainstorm Phase

When Workspace opens, it first presents a **brainstorm** — an AI-generated analysis of what needs to happen:

**Example issue:** *"Add dark mode support to the settings page"*

**Workspace brainstorm output:**

> **Task Summary:** Add a dark mode toggle to the user settings page that persists the preference and applies a dark theme across the application.
>
> **Current State:**
> - The settings page is in `src/pages/Settings.tsx`
> - Styles use CSS modules (`Settings.module.css`)
> - No existing theme system; colors are hardcoded
> - User preferences are stored in `localStorage` via `useSettings` hook
>
> **Proposed Approach:**
> - Create a theme context provider with light/dark modes
> - Add CSS custom properties (variables) for theme colors
> - Add a toggle switch to the Settings page
> - Persist the theme preference using the existing `useSettings` hook
> - Apply the theme class to the document root element

You can **edit the brainstorm** to refine the approach before moving to the plan phase. For example:

- "Also support a 'system' option that follows the OS preference"
- "Don't use CSS variables — use Tailwind's dark mode instead"
- "The toggle should also appear in the navigation bar"

## Step 3: Reviewing and Editing the Plan

After the brainstorm, Workspace generates a **plan** — a list of specific file operations:

```
Plan:
├── CREATE  src/contexts/ThemeContext.tsx
│   └── Create a React context provider for theme management
│       with light, dark, and system modes
│
├── MODIFY  src/pages/Settings.tsx
│   └── Add a theme selection dropdown using the ThemeContext
│       with three options: Light, Dark, System
│
├── MODIFY  src/hooks/useSettings.ts
│   └── Add theme preference to the settings state and
│       localStorage persistence
│
├── CREATE  src/styles/themes.css
│   └── Define CSS custom properties for light and dark themes
│       with color tokens for backgrounds, text, and borders
│
├── MODIFY  src/App.tsx
│   └── Wrap the app in ThemeProvider and apply the active
│       theme class to the root element
│
└── MODIFY  src/components/Navbar.tsx
    └── Add a small theme toggle icon in the navigation bar
```

### Editing the Plan

You can modify the plan before implementation:

- **Remove a file** — Click the ✕ next to a file entry if you don't want that change
- **Add a file** — Click "Add file" to include another file in the plan
- **Edit descriptions** — Click on any description to refine what the change should do
- **Reorder** — Drag entries to change the implementation order

**Example edit:** You decide the Navbar toggle isn't needed yet, so you remove the `Navbar.tsx` entry from the plan.

## Step 4: Reviewing the Implementation

Click **Implement** and Workspace generates the actual code. You see a diff view for each file:

**Example — `src/contexts/ThemeContext.tsx` (new file):**

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      document.documentElement.setAttribute("data-theme", getSystemTheme());
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
```

### Reviewing Effectively

For each file diff, ask yourself:

- ✅ Does this match the plan description?
- ✅ Is the code correct and following project conventions?
- ✅ Are edge cases handled (e.g., SSR, missing `localStorage`)?
- ✅ Are there any security concerns?

You can **edit the code directly** in the Workspace diff view if you want to make small adjustments before creating the PR.

## Step 5: Creating the Pull Request

Once you're satisfied with all the changes:

1. Click **Create Pull Request**
2. Workspace generates a PR title and description based on the original issue and plan
3. Review the PR description, edit if needed
4. The PR is linked to the original issue automatically
5. Click **Create** to open the PR on GitHub

The PR will include all the file changes from the Workspace session, and CI/CD pipelines run as usual.

## Hands-On Walkthrough

Let's do a complete end-to-end Workspace session:

### Task: Add a Health Check Endpoint

**Step 1 — Create an issue:**

```markdown
Title: Add /healthz endpoint for Kubernetes readiness probes

## Description
Add a health check endpoint at `GET /healthz` that returns:
- `200 OK` with `{"status": "healthy", "timestamp": "..."}` when the app is ready
- `503 Service Unavailable` when the database connection is down

## Acceptance Criteria
- Endpoint is at `/healthz` (no authentication required)
- Checks database connectivity
- Returns JSON with status and timestamp
- Responds within 5 seconds (timeout if DB is slow)
- Add a test for both healthy and unhealthy states
```

**Step 2 — Open in Workspace** by clicking the Workspace button on the issue.

**Step 3 — Review the brainstorm.** Verify Workspace correctly identified:
- The web framework in use (Express, Fastify, etc.)
- The database connection module
- Where routes are registered

**Step 4 — Review and edit the plan.** Ensure it includes:
- A new route file or addition to existing routes
- A health check service/function that tests DB connectivity
- Test files for both healthy and unhealthy scenarios

**Step 5 — Review the implementation.** Check that:
- The endpoint returns the correct JSON shape
- DB connectivity check uses a lightweight query (e.g., `SELECT 1`)
- The 5-second timeout is implemented
- Tests mock the database connection for unhealthy state

**Step 6 — Create the PR** and verify CI passes.

### Expected Result

After this walkthrough you should have:
- A working `/healthz` endpoint merged via PR
- Understanding of the brainstorm → plan → implement → PR flow
- Confidence editing plans and reviewing Workspace-generated code

## When to Use Workspace vs. Other Tools

| Use Copilot Workspace For | Use Other Tools For |
|---------------------------|---------------------|
| Well-scoped feature additions | Quick one-line fixes (use inline chat) |
| Multi-file changes with clear requirements | Exploratory coding (use Chat or editor) |
| Issue-driven development | Architecture design (use Chat for discussion) |
| Adding tests for existing functionality | Debugging runtime errors (use Chat + terminal) |
| Documentation updates spanning multiple files | Real-time pair programming (use inline completions) |

## Troubleshooting

### Workspace generated incorrect code

- **Edit the brainstorm** — refine the approach description before moving to the plan
- **Edit the plan** — add or remove files, adjust change descriptions
- **Edit the code** — make direct edits in the diff view
- **Regenerate** — click the regenerate button on a specific file to get a new implementation

### Workspace didn't find the right files

- Ensure your issue description mentions specific file paths or directories
- Edit the plan to manually add files Workspace missed
- Check that the repository is properly indexed (large repos may take time)

### PR has test failures

- Review the test configuration — Workspace may not know your exact test setup
- Edit the generated tests to match your testing framework and patterns
- Use Copilot Chat to debug specific test failures: `@terminal Explain the test error`

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Copilot Workspace** | An AI-native development environment that converts issues into pull requests through structured planning |
| **Brainstorm** | The first phase where Workspace analyzes the issue and proposes an approach |
| **Plan** | A structured list of file operations (create, modify, delete) with descriptions |
| **Implementation** | The generated code changes presented as diffs for each planned file |
| **Session** | A single Workspace interaction from issue to PR, including all brainstorm and plan edits |

## ➡️ Next Steps

Ready to tackle complex multi-file changes? Continue to the intermediate course:
- 🟡 [Copilot Workspace: Complex Multi-File Changes](/Learn-GHCP/courses/technology/copilot-workspace-intermediate/)
