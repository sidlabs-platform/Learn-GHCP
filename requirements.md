Self-Contained GitHub Copilot & Agentic Development Learning Platform

> **Build a fully self-contained, zero-intervention, open-source learning platform for GitHub Copilot and Agentic AI Development, hosted on GitHub Pages, freely accessible to everyone. Once deployed, the platform must operate entirely autonomously — discovering new features, generating courses at three difficulty levels (Beginner, Intermediate, Advanced), reviewing content, publishing updates, and expanding into new industries and personas — all without any human input or manual feature-list curation.**

---

### 🔒 Self-Containment & Zero-Intervention Requirements

The entire solution must be **run-forever** with no manual steps after initial setup:

| Requirement | How It's Achieved |
|---|---|
| **No manual feature tracking** | Feature Discovery Agent autonomously crawls all sources on a cron schedule |
| **No manual course writing** | Course Generation Agent auto-produces hands-on courses from discovered features |
| **No manual review bottleneck** | Content Review Agent validates accuracy, code correctness, and readability; auto-merges PRs that pass all quality gates |
| **No manual deployment** | GitHub Actions auto-builds and deploys to GitHub Pages on every merge to main |
| **No manual source curation** | Agent discovers and registers new sources it encounters during crawls |
| **No manual difficulty tagging** | Difficulty Classification Engine auto-assigns Beginner/Intermediate/Advanced based on rules |
| **Self-healing** | Failed pipelines auto-retry with exponential backoff; stale content auto-flagged for regeneration; deprecated features auto-archived |
| **Self-monitoring** | Pipeline health dashboard, crawl success rates, content freshness scores — all auto-generated and visible on the platform |

**Initial Setup (one-time only):**
1. Fork/clone the repo
2. Add required secrets (GitHub PAT, optional API keys for RSS/search)
3. Enable GitHub Pages and Actions
4. Push to `main` — everything runs from here, forever

---

### 🎚️ Three-Tier Difficulty Level System

> **Every course, lab, and exercise must exist at three levels. The system must auto-classify AND auto-generate content at each level.**

#### Level Definitions

| Level | 🟢 Beginner | 🟡 Intermediate | 🔴 Advanced |
|---|---|---|---|
| **Audience** | First-time Copilot users, students, non-developers exploring AI tools | Developers actively using Copilot daily, looking to go deeper | Power users, architects, platform engineers, extension/plugin builders |
| **Prerequisites** | Basic coding knowledge, a GitHub account | Comfortable with Copilot basics, CLI usage, at least one language proficiency | Deep Copilot experience, multi-tool workflows, understands agent internals |
| **Content Style** | Step-by-step with screenshots/GIFs, every keystroke explained, "follow along" format | Guided labs with context but less hand-holding, "build this" format | Open-ended challenges, architecture decisions, "design and extend" format |
| **Code Complexity** | Single-file, single-language, <50 lines | Multi-file, real-world patterns, 50–300 lines | Multi-repo, multi-agent, production-grade, 300+ lines |
| **Exercise Type** | "Type this command and observe the output" | "Build a working feature using these tools" | "Design a custom agent/plugin/MCP server that solves this problem" |
| **Assessment** | Multiple choice quiz, command recall | Working code submission, mini-project | Capstone project, open-source contribution, peer review |

#### Auto-Classification Rules

The Course Generation Agent must apply these rules to every piece of generated content:

```yaml
difficulty_classification:
  beginner:
    triggers:
      - feature_type: "getting_started" OR "installation" OR "first_use"
      - concepts_required: <= 2
      - tools_involved: <= 1
      - estimated_time: <= 15_minutes
    content_rules:
      - include_every_keystroke: true
      - include_expected_output: true
      - include_screenshots_or_gifs: true
      - include_troubleshooting_section: true
      - include_glossary_links: true
      - code_lines_max: 50
      - no_assumed_prior_copilot_knowledge: true

  intermediate:
    triggers:
      - feature_type: "workflow" OR "integration" OR "customization"
      - concepts_required: 3-5
      - tools_involved: 2-3
      - estimated_time: 15-45_minutes
    content_rules:
      - guided_but_not_prescriptive: true
      - include_why_not_just_how: true
      - include_real_world_scenario: true
      - include_code_samples_with_explanation: true
      - include_extension_challenges: true
      - code_lines: 50-300

  advanced:
    triggers:
      - feature_type: "architecture" OR "extension" OR "plugin" OR "multi_agent"
      - concepts_required: >= 6
      - tools_involved: >= 4
      - estimated_time: >= 45_minutes
    content_rules:
      - open_ended_problem_statement: true
      - minimal_scaffolding: true
      - include_design_decisions: true
      - include_production_considerations: true
      - include_capstone_project: true
      - code_lines: 300+
```

#### Level Progression & Learning Paths

The platform must auto-generate **learning paths** that chain courses across levels:

```
🟢 Beginner: "Your First Copilot CLI Session"
    ↓ (prerequisite)
🟡 Intermediate: "Build a Multi-Step Workflow with Plan Mode"
    ↓ (prerequisite)
🔴 Advanced: "Design a Custom CLI Plugin with MCP Integration"
```

Each course page must display:
- Current difficulty badge (🟢🟡🔴)
- Prerequisites (linked to prior courses)
- "Next Steps" (linked to higher-level courses)
- Estimated completion time
- Persona & technology tags

---

### 📚 Practical Hands-On Course Tracks (All Three Levels)

> **Every track below must auto-generate courses at all three levels for every feature discovered.**

#### **Track 1: Copilot Agent Skills**
| 🟢 Beginner | 🟡 Intermediate | 🔴 Advanced |
|---|---|---|
| What are skills? Install your first community skill | Create a custom `SKILL.md` from scratch, use `/skill` in CLI | Build multi-step skills with MCP integration, publish to Skills Marketplace, build skills that chain other skills |

#### **Track 2: Copilot CLI — Every Command**
| 🟢 Beginner | 🟡 Intermediate | 🔴 Advanced |
|---|---|---|
| Install, login, first interactive prompt, basic slash commands | Plan mode, model switching, session management, context optimization | Autopilot mode for complex tasks, programmatic/scripting mode, building CLI automation pipelines |

#### **Track 3: Copilot CLI Plugins & Extensions**
| 🟢 Beginner | 🟡 Intermediate | 🔴 Advanced |
|---|---|---|
| What are plugins? Install and use an existing one | Build a simple project-scoped extension with hot-reload | Build a full agent plugin bundle (skills + hooks + MCP), distribute via Git, JSON-RPC protocol deep-dive |

#### **Track 4: Copilot Agents & Agentic Workflows**
| 🟢 Beginner | 🟡 Intermediate | 🔴 Advanced |
|---|---|---|
| Assign an issue to Copilot, watch it open a PR | Build a custom `.agent.md`, create prompt file templates, use the Agents Tab | Multi-agent orchestration (Claude+Codex+Copilot), lifecycle hooks, self-healing CI, agentic code review pipelines |

#### **Track 5: MCP (Model Context Protocol)**
| 🟢 Beginner | 🟡 Intermediate | 🔴 Advanced |
|---|---|---|
| What is MCP? Connect Copilot CLI to the GitHub MCP server | Build a custom stdio MCP server, connect to PostgreSQL/MongoDB | Build remote HTTP/SSE MCP servers, chain multiple MCP servers, production deployment with auth and rate limiting |

#### **Track 6: Industry & Enterprise Use Cases**

> **Not restricted to the list below.** The system auto-discovers new industries and generates courses at all three levels.

| Industry | 🟢 Beginner | 🟡 Intermediate | 🔴 Advanced |
|---|---|---|---|
| **Mainframe / COBOL** | Explore COBOL code with Copilot Chat | Translate COBOL modules to Java with agent assistance | End-to-end mainframe modernization pipeline with custom agents, Zowe + Copilot CLI |
| **Salesforce** | Generate an Apex trigger with Copilot | Build a full Lightning Web Component, automate SFDX workflows | Custom Copilot agent for Salesforce CI/CD, MCP server for Salesforce APIs |
| **SAP / ABAP** | Scaffold an ABAP class with Copilot in BAS | Generate OData services and SAPUI5 apps | ABAP-to-cloud migration pipeline with multi-agent orchestration |
| **Healthcare** | Generate FHIR API boilerplate | Build HIPAA-compliant patterns with Copilot review | IoT firmware + edge AI + compliance audit agent pipeline |
| **Financial Services** | Generate risk model scaffolding | Regulatory-compliant code patterns with agent review | Trading system prototyping with multi-agent, secure coding audit |
| **Gaming** | Unity script generation with Copilot | Shader pipeline and networking code | AR/VR multi-agent development workflow, performance optimization agents |
| **IoT / Embedded** | Microcontroller "Hello World" with Copilot | BLE/Wi-Fi driver development, RTOS tasks | Edge AI inference pipeline, custom hardware agent with MCP |
| **DevOps / Platform** | Generate a GitHub Actions workflow | Terraform/Kubernetes manifests with Copilot | Self-healing infrastructure pipeline with agentic orchestration |
| **Data Science / ML** | Jupyter notebook with Copilot | Feature engineering and model training scripts | Full MLOps pipeline scaffolding with multi-agent workflows |
| **Mobile** | React Native starter with Copilot | Flutter app with testing and CI | Cross-platform multi-agent release pipeline |
| **Legacy Modernization** | Explore VB6/FORTRAN/Perl with Copilot | Translate legacy modules to modern languages | Full legacy-to-cloud migration with custom discovery and translation agents |
| **Cybersecurity** | Secure code suggestions with Copilot | SAST/DAST scanning patterns, compliance checks | Pen-testing script generation, full security audit agent pipeline |
| **Low-Code Platforms** | Power Platform connector with Copilot | Mendix/OutSystems custom extensions | Multi-platform integration agent with MCP |

#### **Track 7: Copilot for Every Persona (All Levels)**

Auto-generated per persona at all three levels. New personas auto-discovered from community content.

#### **Track 8: Copilot Across Technologies (All Levels)**

Auto-generated per language/framework/cloud at all three levels. New technologies auto-discovered.

---

### 🤖 Fully Autonomous Pipeline (Zero Intervention)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DEPLOY ONCE → RUNS FOREVER                                              │
│                                                                          │
│  ┌─── CRON: Daily ───────────────────────────────────────────────────┐   │
│  │  STAGE 1: FEATURE DISCOVERY AGENT (Copilot CLI autopilot)        │   │
│  │  ├─ Crawl ALL Source Registry feeds (RSS, APIs, docs, repos)     │   │
│  │  ├─ Detect new / updated / deprecated features & capabilities    │   │
│  │  ├─ Auto-discover and register NEW sources found during crawl    │   │
│  │  ├─ Update living Feature Registry (features.yaml)               │   │
│  │  └─ Diff against course catalog → produce gap report             │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                          ↓                                               │
│  ┌─── CRON: Daily (after discovery) ─────────────────────────────────┐   │
│  │  STAGE 2: COURSE GENERATION AGENT (Copilot CLI autopilot)        │   │
│  │  ├─ For each gap: generate courses at ALL THREE LEVELS           │   │
│  │  │   ├─ 🟢 Beginner version (guided, every step explained)      │   │
│  │  │   ├─ 🟡 Intermediate version (real-world scenario, guided)   │   │
│  │  │   └─ 🔴 Advanced version (open-ended, production-grade)      │   │
│  │  ├─ Auto-classify difficulty using classification rules          │   │
│  │  ├─ Auto-generate learning path links (prerequisites, next)      │   │
│  │  ├─ Auto-generate Codespaces devcontainer configs per course     │   │
│  │  ├─ For updated features: update existing courses at all levels  │   │
│  │  └─ For deprecated features: archive with migration guide        │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                          ↓                                               │
│  ┌─── Triggered after generation ────────────────────────────────────┐   │
│  │  STAGE 3: CONTENT REVIEW AGENT (Copilot CLI autopilot)           │   │
│  │  ├─ Technical accuracy check against official docs               │   │
│  │  ├─ Code correctness (lint, compile, test all code samples)      │   │
│  │  ├─ Difficulty-level validation (does beginner content meet      │   │
│  │  │   beginner rules? etc.)                                       │   │
│  │  ├─ Accessibility & readability check                            │   │
│  │  ├─ Learning path integrity (no broken prerequisite chains)      │   │
│  │  └─ Assign quality score (0-100)                                 │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                          ↓                                               │
│  ┌─── Triggered after review ────────────────────────────────────────┐   │
│  │  STAGE 4: AUTO-PUBLISH (fully autonomous)                        │   │
│  │  ├─ Quality score >= 85 → AUTO-MERGE PR, no human needed         │   │
│  │  ├─ Quality score 60-84 → Label "needs-review", wait 48hrs,     │   │
│  │  │   auto-merge if no objection                                  │   │
│  │  ├─ Quality score < 60 → Label "needs-human-review", notify      │   │
│  │  │   via GitHub Issue (but don't block other content)             │   │
│  │  ├─ On merge → GitHub Pages auto-build and deploy                │   │
│  │  ├─ Update "What's New" feed on platform                         │   │
│  │  └─ Update course catalog index and learning paths               │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                          ↓                                               │
│  ┌─── CRON: Weekly ─────────────────────────────────────────   ────────┐   │
│  │  STAGE 5: SELF-MAINTENANCE (autonomous)                          │   │
│  │  ├─ Freshness audit: flag courses not updated in 30+ days        │   │
│  │  ├─ Broken link checker across all course content                │   │
│  │  ├─ Code sample test runner (re-validate all exercises)          │   │
│  │  ├─ Source Registry health check (remove dead feeds, add new)    │   │
│  │  ├─ Pipeline health report (success rates, error trends)         │   │
│  │  ├─ Auto-regenerate stale or failing courses                     │   │
│  │  └─ Publish platform health dashboard page                       │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  SELF-HEALING:                                                           │
│  ├─ Failed pipeline steps → auto-retry with exponential backoff          │
│  ├─ Persistent failures → auto-open GitHub Issue with diagnostics        │
│  ├─ Rate-limited API calls → queue and retry in next cycle               │
│  └─ Token/secret expiry → alert via Issue, degrade gracefully            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 🏗️ Platform Architecture

- **Hosting:** GitHub Pages (static site, Astro/Eleventy/Jekyll)
- **Content:** All Markdown, version-controlled, auto-generated
- **Automation:** GitHub Actions (cron-scheduled, event-driven)
- **AI Engine:** Copilot CLI in autopilot/agentic mode for all agents
- **State:** `features.yaml` (Feature Registry), `catalog.yaml` (Course Catalog), `sources.yaml` (Source Registry) — all version-controlled in the repo
- **Search:** Client-side (Lunr.js/Pagefind) with faceted filtering by level, persona, technology, industry
- **Design:** Responsive, WCAG-compliant, mobile-first, dark/light mode
- **Monitoring:** Auto-generated `/health` page with pipeline stats, content freshness scores, crawl success rates

---

### 🧭 Learner Experience

```
Landing Page
├── "I'm a Beginner" → 🟢 Curated beginner learning path
├── "I'm Intermediate" → 🟡 Curated intermediate learning path
├── "I'm Advanced" → 🔴 Curated advanced learning path
├── Browse by Track (Skills, CLI, Agents, MCP, etc.)
├── Browse by Industry (Mainframe, Salesforce, SAP, etc.)
├── Browse by Persona (Developer, DevOps, Data Scientist, etc.)
├── Browse by Technology (Python, React, Terraform, etc.)
├── "What's New" — auto-generated weekly digest
├── Feature Explorer — searchable registry of all Copilot features
├── Learning Path Visualizer — interactive graph of course dependencies
└── Health Dashboard — pipeline status, content freshness
```

Each course page shows:
- 🟢🟡🔴 Difficulty badge
- Estimated time
- Prerequisites (linked)
- Next steps (linked)
- Persona & technology tags
- "Last verified" date (auto-updated by maintenance pipeline)
- Embedded Codespaces / StackBlitz launch button
- "Was this helpful?" feedback → auto-creates GitHub Issue

---

### 📰 Source Registry (Auto-Expanding)

*(Same comprehensive source table as v2, plus):*

The agent must also:
- **Auto-discover new sources** encountered during any crawl (new blogs, new docs pages, new community repos)
- **Add them to `sources.yaml`** with a confidence score
- **High-confidence sources** (official docs, known blogs) → auto-added
- **Low-confidence sources** → added with `unverified` flag, used after one successful content extraction

---

### 🎯 Design Principles

1. **Deploy Once, Run Forever** — Zero human intervention after initial setup
2. **Three Levels for Everyone** — Every feature has Beginner, Intermediate, and Advanced courses
3. **Hands-On Only** — Every module is runnable. No theory-only slides
4. **Self-Discovering** — The system finds features, industries, personas, and sources on its own
5. **Self-Healing** — Broken content auto-repaired, stale content auto-refreshed, dead links auto-fixed
6. **Self-Expanding** — New industries, technologies, and personas auto-generate new course tracks
7. **Progressive Learning Paths** — Clear 🟢→🟡→🔴 journeys with prerequisite chains
8. **Community-Augmented** — Open for contributions via PRs, but never dependent on them

