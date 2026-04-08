---
title: "Your First Copilot Cloud Agent"
description: "Learn what Copilot cloud agents (coding agents) are, assign your first issue to Copilot, and watch it create a pull request autonomously."
track: "agents"
difficulty: "beginner"
featureRefs:
  - copilot-agents
  - agent-mode
personaTags:
  - developer
  - student
technologyTags:
  - github
  - copilot
  - git
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

# 🟢 Your First Copilot Cloud Agent

Welcome! In this course, you'll learn what Copilot cloud agents are, assign your first issue to one, and watch it autonomously create a pull request — all without leaving GitHub.

## Prerequisites

- A GitHub account with **Copilot Enterprise** or **Copilot Pro+** access
- A repository you own (or have write access to) with GitHub Actions enabled
- Basic familiarity with GitHub issues and pull requests

## What Are Copilot Cloud Agents?

**Copilot cloud agents** (also called **coding agents**) are autonomous AI agents that run in the cloud and can perform multi-step development tasks on your behalf. Unlike Copilot Chat — which responds to questions in a conversation — a cloud agent:

| Feature | Copilot Chat | Cloud Agent |
|---------|-------------|-------------|
| **Interaction** | Conversational Q&A | Autonomous task execution |
| **Scope** | Single file or snippet | Entire repository |
| **Output** | Suggestions in editor | Branch + pull request |
| **Trigger** | You type a prompt | You assign an issue |
| **Execution** | Your machine | Cloud (GitHub-hosted runner) |

Think of Copilot Chat as a **pair programmer** sitting next to you, and a cloud agent as a **junior developer** you assign a ticket to.

## How Cloud Agents Work

When you assign an issue to Copilot, the following pipeline executes automatically:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   1. Issue    │────▶│  2. Branch   │────▶│   3. Code    │────▶│   4. PR      │
│   Assigned    │     │   Created    │     │   Written    │     │   Opened     │
│   to Copilot  │     │  (auto)      │     │  (agent)     │     │  (for review)│
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **Issue assigned** — You assign a GitHub issue to `@copilot` (or the Copilot agent)
2. **Branch created** — The agent creates a new feature branch from the default branch
3. **Code written** — The agent reads the repo, plans changes, writes code, and runs checks
4. **PR opened** — The agent opens a pull request linked to the original issue

## Step 1: Create a Simple Issue

Navigate to your repository on GitHub and create a new issue:

- **Title:** `Add a greeting function to utils.js`
- **Body:**

```markdown
## Description
Add a new function called `greet` to `src/utils.js` that accepts a `name`
parameter and returns a personalized greeting string.

## Acceptance criteria
- Function is named `greet` and exported
- Returns `"Hello, {name}! Welcome aboard."` for a given name
- Includes a JSDoc comment describing the function
- Add a basic test in `tests/utils.test.js`
```

> 💡 **Tip:** The more specific your issue description, the better the agent's output. Include acceptance criteria, file paths, and expected behavior.

## Step 2: Assign the Issue to Copilot

There are two ways to trigger a cloud agent:

### Option A: Assign via the Issue Sidebar

1. Open the issue you just created
2. In the right sidebar, click **Assignees**
3. Select **Copilot** from the list

### Option B: Mention in a Comment

Add a comment to the issue:

```markdown
@copilot Please implement this issue.
```

After assignment, you'll see a status indicator showing that the agent has picked up the task.

## Step 3: Watch the Agent Work

Navigate to the **Copilot** tab in your repository (or check the issue for status updates). You'll see the agent's progress:

1. **Planning** — The agent reads the issue, explores the repo structure, and creates a plan
2. **Coding** — The agent writes the implementation across one or more files
3. **Validation** — The agent runs any configured checks (linters, tests, builds)
4. **PR creation** — The agent opens a pull request with a summary of changes

The agent typically completes simple tasks in **2–5 minutes**. More complex tasks may take longer.

## Step 4: Review the Agent's Pull Request

Once the agent opens a PR, review it just as you would any human-authored PR:

```javascript
// src/utils.js — Example of what the agent might generate

/**
 * Returns a personalized greeting string.
 * @param {string} name - The name of the person to greet.
 * @returns {string} A greeting message.
 */
export function greet(name) {
  return `Hello, ${name}! Welcome aboard.`;
}
```

**Review checklist:**

- ✅ Does the code match the acceptance criteria?
- ✅ Are tests included and passing?
- ✅ Is the code style consistent with the rest of the repo?
- ✅ Are there any security concerns?

You can request changes by leaving review comments — the agent can pick up follow-up instructions if you comment on the PR.

## When to Use Cloud Agents vs. Manual Coding

| Use Cloud Agents For | Code Manually For |
|---------------------|-------------------|
| Well-defined, scoped tasks | Exploratory prototyping |
| Boilerplate generation | Complex architectural decisions |
| Adding tests to existing code | Security-critical logic |
| Bug fixes with clear repro steps | Performance-sensitive hot paths |
| Documentation updates | Cross-repo refactors (for now) |

## Troubleshooting

### Agent didn't respond to the issue

- **Check access:** Ensure Copilot agents are enabled in your repository or organization settings under **Settings → Copilot → Coding agent**
- **Check the issue:** The issue must be in an open state and assigned to Copilot
- **Check Actions:** Cloud agents require GitHub Actions to be enabled on the repository

### PR has issues or incorrect code

- **Leave a review comment:** Describe what's wrong — the agent can iterate on feedback
- **Be specific:** Instead of "this is wrong," say "the function should return a `Promise<string>` not a `string`"
- **Close and re-assign:** If the PR is too far off, close it, refine the issue description, and re-assign

### Agent took too long

- Simple tasks should complete in under 5 minutes. If the agent is still running after 15 minutes, check the **Actions** tab for the agent's workflow run — it may have hit an error or be waiting on a failing CI step.

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Cloud agent** | An autonomous AI agent that runs in GitHub's cloud infrastructure to complete development tasks |
| **Coding agent** | Another name for Copilot's cloud agent, emphasizing its code-generation capability |
| **Agentic workflow** | A development workflow where AI agents autonomously perform tasks like coding, testing, and PR creation |
| **Autonomous PR** | A pull request created entirely by an AI agent without human code authoring |
| **copilot-setup-steps.yml** | A configuration file that defines the agent's environment (tools, dependencies, build steps) |

## ➡️ Next Steps

Ready to customize how agents work in your repository? Continue to the intermediate course:
- 🟡 [Custom Agent Configuration and Prompt Engineering](/Learn-GHCP/courses/agents/copilot-agents-intermediate/)
