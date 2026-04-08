---
title: "Getting Started with Copilot Agent Skills"
description: "Learn what Copilot skills are, how to discover community skills, and install your first skill to enhance Copilot's capabilities."
track: "skills"
difficulty: "beginner"
featureRefs:
  - copilot-skills
personaTags:
  - developer
  - student
technologyTags:
  - github
  - copilot
estimatedMinutes: 15
lastGenerated: 2026-04-08
published: true
---

# 🟢 Getting Started with Copilot Agent Skills

Welcome! In this course you'll learn what Copilot skills are, discover community-built skills, and install your first one to supercharge your workflow.

## Prerequisites

- A GitHub account with Copilot access
- Copilot Chat enabled in your IDE (VS Code or JetBrains)
- Basic familiarity with GitHub repositories

## What Are Copilot Skills?

A **skill** is a set of instructions that teaches Copilot new domain-specific knowledge. Skills are defined in a special file called `SKILL.md` placed at the root of a GitHub repository. When a skill is installed, Copilot reads these instructions and gains new capabilities — like knowing your company's API conventions, understanding a framework's patterns, or following a specific coding standard.

Think of skills as **specialized training documents** that Copilot can reference during conversations and code generation.

| Concept | Description |
|---------|-------------|
| **Skill** | A packaged set of instructions that extends Copilot's knowledge |
| **SKILL.md** | The Markdown file that defines a skill's behavior and instructions |
| **Context** | The additional knowledge a skill provides during a Copilot session |
| **Capability** | A specific action or area of expertise a skill enables |

> 💡 **Key insight:** Skills don't change Copilot's core model — they provide additional context that guides Copilot's responses for specific domains or tasks.

## Where to Find Community Skills

Community-built skills are shared as public GitHub repositories. Here's where to look:

1. **GitHub Marketplace** — Browse the [GitHub Marketplace](https://github.com/marketplace) and filter for Copilot skills.
2. **GitHub Topics** — Search repositories tagged with `copilot-skill` on GitHub:
   ```
   https://github.com/topics/copilot-skill
   ```
3. **Organization repositories** — Many teams publish internal skills in their GitHub org. Check your company's org for shared skills.
4. **Community lists** — Look for curated "awesome" lists that catalog popular skills by category (e.g., frontend, DevOps, security).

> ⚠️ **Tip:** Always review a skill's `SKILL.md` before installing. Understand what instructions it provides and ensure they align with your needs.

## Step-by-Step: Install Your First Skill

Let's install a community skill that teaches Copilot best practices for writing TypeScript utility functions.

### Step 1 — Find a skill repository

Navigate to a skill repository on GitHub. For this example, we'll use a hypothetical skill:

```
https://github.com/example-org/typescript-utils-skill
```

The repository should contain a `SKILL.md` file at its root.

### Step 2 — Review the SKILL.md

Open the `SKILL.md` and read through its contents:

```markdown
---
name: "TypeScript Utils"
description: "Best practices for TypeScript utility functions"
---

# TypeScript Utility Function Patterns

When writing utility functions in TypeScript:
- Always use explicit return types
- Prefer `readonly` parameters for arrays and objects
- Include JSDoc comments with @example tags
- Use generics over `any` for flexible functions
```

### Step 3 — Install the skill

In your IDE, open Copilot Chat and use the skill installation command:

```
Install the skill from github.com/example-org/typescript-utils-skill
```

Alternatively, add the skill through your Copilot settings:

1. Open **Settings** → **GitHub Copilot** → **Skills**
2. Click **Add Skill**
3. Paste the repository URL: `example-org/typescript-utils-skill`
4. Click **Enable**

### Step 4 — Verify the installation

Check that the skill appears in your active skills list:

1. Open Copilot Chat
2. Type: `What skills do you have available?`
3. You should see "TypeScript Utils" listed among your active skills

## How Skills Extend Copilot's Knowledge

Once installed, skills work automatically. When you ask Copilot a question or request code that falls within a skill's domain, Copilot includes the skill's instructions as additional context.

**Before the skill:**
```
You: Write a utility function to deep merge two objects

Copilot: (generic implementation without type safety)
```

**After installing the TypeScript Utils skill:**
```
You: Write a utility function to deep merge two objects

Copilot: (implementation with explicit return types, readonly params,
          generics, and JSDoc with @example)
```

The skill's instructions guide Copilot to produce output that matches your team's standards — without you having to repeat those standards every time.

## Verify the Skill Is Working

Test your newly installed skill with these prompts:

```
Write a utility function that filters an array by a predicate
```

**Expected behavior:** The generated code should include explicit return types, use generics, and have JSDoc comments — all patterns defined in the skill.

```
Create a utility to safely access nested object properties
```

**Expected behavior:** The function should use `readonly` parameters and avoid `any` types, following the skill's instructions.

> 💡 **Pro tip:** If the output doesn't reflect the skill's patterns, try being more specific: "Using our TypeScript utility patterns, write a function that..."

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Skill doesn't appear in list | Ensure the repository has a valid `SKILL.md` at the root and re-check the URL |
| Copilot ignores skill patterns | Include a reference to the skill's domain in your prompt (e.g., "following our TS patterns") |
| Installation fails | Verify you have access to the repository and that Copilot Skills is enabled for your account |
| Skill conflicts with another | Disable overlapping skills — only keep the most specific one active |

> ⚠️ **Note:** Skills require Copilot to be connected and the skill's repository to be accessible. Private repository skills need appropriate permissions.

## 📚 Glossary

| Term | Definition |
|------|------------|
| **Skill** | A packaged extension that provides Copilot with domain-specific knowledge via a `SKILL.md` file |
| **SKILL.md** | A Markdown file at the root of a repository that defines instructions, patterns, and examples for Copilot |
| **Context** | The background knowledge and instructions a skill injects into Copilot's reasoning during a session |
| **Capability** | A specific area of expertise or action type that a skill enables Copilot to perform |

## 🎯 What You Learned

- Skills are instruction sets defined in `SKILL.md` that extend Copilot's knowledge
- Community skills are found on GitHub Marketplace, topic searches, and org repositories
- Installing a skill adds domain-specific context to all your Copilot interactions
- You can verify a skill is working by testing prompts in its domain

## ➡️ Next Steps

Ready to build your own skill? Continue to the intermediate course:

**[Create a Custom SKILL.md from Scratch →](/Learn-GHCP/courses/skills/agent-skills-intermediate/)**
