---
title: "Self-Healing CI/CD with Agentic Copilot"
description: "Build autonomous CI/CD systems that detect, diagnose, and fix pipeline failures using Copilot agents and MCP servers."
track: "technology"
difficulty: "advanced"
featureRefs:
  - copilot-agents
  - copilot-cli
  - mcp-integration
personaTags:
  - devops
  - architect
technologyTags:
  - github-actions
  - ci-cd
  - mcp
  - copilot
prerequisites:
  - github-actions-ai-intermediate
estimatedMinutes: 75
lastGenerated: 2026-04-08
published: true
---

# 🔴 Self-Healing CI/CD with Agentic Copilot

What if your CI/CD pipeline could detect a failure, diagnose the root cause, generate a fix, and open a PR — all without human intervention? That's the promise of self-healing CI/CD powered by Copilot agents and MCP servers.

In this course you'll architect autonomous pipeline systems that monitor, diagnose, repair, and validate themselves — with human oversight at critical decision points.

## Prerequisites

- Completed [Smart CI/CD Pipelines with Copilot](/Learn-GHCP/courses/technology/github-actions-ai-intermediate/)
- Familiarity with GitHub Actions at an intermediate level
- Understanding of MCP (Model Context Protocol) concepts
- Experience with at least one deployment environment

---

## Self-Healing Pipeline Architecture

A self-healing pipeline has four stages that form a continuous feedback loop:

```
┌──────────────────────────────────────────────────┐
│              Self-Healing CI/CD Loop              │
│                                                  │
│   ┌──────────┐    ┌───────────┐    ┌──────────┐ │
│   │  DETECT  │───▶│ DIAGNOSE  │───▶│   FIX    │ │
│   │          │    │           │    │          │ │
│   │ Monitor  │    │ Analyze   │    │ Generate │ │
│   │ failures │    │ root cause│    │ patch    │ │
│   └──────────┘    └───────────┘    └────┬─────┘ │
│        ▲                                │       │
│        │          ┌───────────┐         │       │
│        └──────────│ VALIDATE  │◀────────┘       │
│                   │           │                  │
│                   │ Test fix  │                  │
│                   │ & deploy  │                  │
│                   └───────────┘                  │
└──────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Role | Technology |
|-----------|------|-----------|
| **Detector** | Monitors workflow runs for failures | GitHub Actions + webhooks |
| **Diagnoser** | Analyzes logs and identifies root cause | Copilot agent + MCP server |
| **Fixer** | Generates code or config patches | Copilot agent (cloud agent) |
| **Validator** | Runs tests on the proposed fix | GitHub Actions CI |

> ⚠️ **Warning:** Self-healing systems must include circuit breakers and human approval gates. An unconstrained auto-fix loop can create cascading failures.

---

## Stage 1: Failure Detection

The first step is automatically detecting when something goes wrong and gathering context.

### Failure Detection Workflow

```yaml
# .github/workflows/detect-failures.yml
name: Failure Detector

on:
  workflow_run:
    workflows: ["CI", "Deploy"]
    types: [completed]

permissions:
  contents: read
  actions: read
  issues: write

jobs:
  detect:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Gather failure context
        id: context
        uses: actions/github-script@v7
        with:
          script: |
            const runId = context.payload.workflow_run.id;

            // Get failed jobs
            const { data: jobs } = await github.rest.actions.listJobsForWorkflowRun({
              owner: context.repo.owner,
              repo: context.repo.repo,
              run_id: runId,
              filter: 'latest',
            });

            const failedJobs = jobs.jobs.filter(j => j.conclusion === 'failure');

            // Get logs for failed jobs
            const failureSummary = [];
            for (const job of failedJobs) {
              const { data: logs } = await github.rest.actions.downloadJobLogsForWorkflowRun({
                owner: context.repo.owner,
                repo: context.repo.repo,
                job_id: job.id,
              });

              // Extract the last 100 lines (most relevant)
              const logLines = logs.split('\n').slice(-100).join('\n');

              failureSummary.push({
                jobName: job.name,
                failedStep: job.steps.find(s => s.conclusion === 'failure')?.name,
                logs: logLines,
              });
            }

            // Get changed files
            const { data: commits } = await github.rest.repos.getCommit({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: context.payload.workflow_run.head_sha,
            });

            const result = {
              runId,
              branch: context.payload.workflow_run.head_branch,
              sha: context.payload.workflow_run.head_sha,
              failedJobs: failureSummary,
              changedFiles: commits.files.map(f => f.filename),
            };

            core.setOutput('failure_context', JSON.stringify(result));
            return result;

      - name: Create diagnostic issue
        uses: actions/github-script@v7
        with:
          script: |
            const ctx = JSON.parse('${{ steps.context.outputs.failure_context }}');

            const body = `## 🔴 CI Failure Detected

            **Run:** [#${ctx.runId}](${context.payload.workflow_run.html_url})
            **Branch:** \`${ctx.branch}\`
            **Commit:** \`${ctx.sha.slice(0, 7)}\`

            ### Failed Jobs
            ${ctx.failedJobs.map(j => `
            #### ${j.jobName} — Step: ${j.failedStep}
            \`\`\`
            ${j.logs.slice(-2000)}
            \`\`\`
            `).join('\n')}

            ### Changed Files
            ${ctx.changedFiles.map(f => `- \`${f}\``).join('\n')}

            ---
            _Auto-generated by Failure Detector. Assign to Copilot for auto-diagnosis._
            `;

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `CI Failure: ${ctx.failedJobs.map(j => j.jobName).join(', ')}`,
              body,
              labels: ['ci-failure', 'auto-detected'],
            });
```

---

## Stage 2: Auto-Diagnosis with Copilot Agents

Once a failure is detected, a Copilot agent can analyze the logs and identify the root cause.

### Diagnostic Agent Workflow

When you assign a CI failure issue to Copilot, the cloud agent can:

1. Read the failure logs from the issue body
2. Identify error patterns (compilation error, test failure, dependency issue, etc.)
3. Cross-reference with changed files
4. Propose a root cause

### Common Failure Categories

| Category | Log Pattern | Typical Root Cause |
|----------|------------|-------------------|
| **Build failure** | `error TS2345`, `SyntaxError` | Type error, syntax error in changed file |
| **Test failure** | `FAIL src/...`, `AssertionError` | Logic change broke an assertion |
| **Dependency issue** | `npm ERR! 404`, `peer dep conflict` | Missing or incompatible package |
| **Timeout** | `Error: Timeout`, `exceeded deadline` | Slow test, network issue, resource contention |
| **Lint failure** | `eslint: ...`, `prettier: ...` | Formatting or style violation |
| **Permission error** | `403 Forbidden`, `Permission denied` | Missing `permissions:` in workflow or token scope |

### Diagnostic Prompt for Copilot Agent

When assigning the issue to Copilot, include instructions in a `.github/copilot-instructions.md`:

```markdown
## CI Failure Diagnosis Instructions

When assigned a CI failure issue:

1. Read the failure logs in the issue body
2. Identify the error category (build, test, dependency, lint, permission)
3. Find the root cause by:
   - Matching error messages to specific files and line numbers
   - Checking the changed files listed in the issue
   - Reading the failing test to understand what it expects
4. Propose a fix as a PR with:
   - The minimal code change to fix the issue
   - A comment explaining the root cause
   - Updated or new tests if applicable
5. Do NOT auto-merge — wait for human review
```

---

## Stage 3: Agent-Driven Fix Generation

The fix generation stage creates a patch, validates it compiles, and opens a PR.

### Fix Generation Workflow

```yaml
# .github/workflows/auto-fix.yml
name: Auto-Fix CI Failures

on:
  issues:
    types: [assigned]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  auto-fix:
    if: |
      contains(github.event.issue.labels.*.name, 'ci-failure') &&
      github.event.assignee.login == 'copilot[bot]'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - run: npm ci

      - name: Parse failure context
        id: parse
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.issue;
            const body = issue.body;

            // Extract error patterns from logs
            const errorPatterns = {
              typescript: /error (TS\d+):/g,
              test: /FAIL (.+\.test\.\w+)/g,
              dependency: /npm ERR! (\d{3})/g,
              lint: /(eslint|prettier).*Error/g,
            };

            const errors = {};
            for (const [type, pattern] of Object.entries(errorPatterns)) {
              const matches = [...body.matchAll(pattern)];
              if (matches.length > 0) {
                errors[type] = matches.map(m => m[1]);
              }
            }

            core.setOutput('error_type', Object.keys(errors)[0] || 'unknown');
            core.setOutput('errors', JSON.stringify(errors));

      - name: Attempt auto-fix for lint errors
        if: steps.parse.outputs.error_type == 'lint'
        run: |
          npm run lint -- --fix || true
          npm run format || true

      - name: Attempt auto-fix for dependency errors
        if: steps.parse.outputs.error_type == 'dependency'
        run: |
          npm audit fix || true
          npm dedupe || true

      - name: Verify fix
        id: verify
        run: |
          npm run build 2>&1 && echo "build=success" >> "$GITHUB_OUTPUT" || echo "build=failed" >> "$GITHUB_OUTPUT"
          npm test 2>&1 && echo "test=success" >> "$GITHUB_OUTPUT" || echo "test=failed" >> "$GITHUB_OUTPUT"

      - name: Create fix PR
        if: steps.verify.outputs.build == 'success'
        uses: peter-evans/create-pull-request@v6
        with:
          branch: "auto-fix/issue-${{ github.event.issue.number }}"
          title: "fix: auto-resolve CI failure from #${{ github.event.issue.number }}"
          body: |
            ## Automated Fix

            **Issue:** #${{ github.event.issue.number }}
            **Error type:** ${{ steps.parse.outputs.error_type }}
            **Build:** ${{ steps.verify.outputs.build }}
            **Tests:** ${{ steps.verify.outputs.test }}

            ### Changes Applied
            - Auto-fix for `${{ steps.parse.outputs.error_type }}` errors

            > ⚠️ This PR was generated automatically. Please review carefully before merging.
          labels: auto-fix, needs-review
```

### Circuit Breaker — Preventing Infinite Loops

A critical safety mechanism: if the auto-fix itself fails CI, stop the loop.

```yaml
      - name: Check circuit breaker
        id: circuit
        uses: actions/github-script@v7
        with:
          script: |
            // Count recent auto-fix attempts for this branch
            const { data: prs } = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'all',
              head: `${context.repo.owner}:auto-fix/issue-${context.payload.issue.number}`,
            });

            const recentAttempts = prs.filter(pr => {
              const created = new Date(pr.created_at);
              const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
              return created > hourAgo;
            });

            if (recentAttempts.length >= 3) {
              core.setOutput('tripped', 'true');
              core.warning('Circuit breaker tripped: 3+ auto-fix attempts in the last hour');
            } else {
              core.setOutput('tripped', 'false');
            }

      - name: Notify on circuit breaker trip
        if: steps.circuit.outputs.tripped == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.issue.number,
              body: '🛑 **Circuit breaker tripped.** Auto-fix has been attempted 3+ times in the last hour without success. Manual intervention required.',
            });
```

---

## Stage 4: MCP Server for CI Metrics

An MCP server provides Copilot with real-time CI/CD metrics for smarter decision-making.

### CI Metrics MCP Server

```typescript
// mcp-servers/ci-metrics/src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "ci-metrics",
  version: "1.0.0",
});

// Tool: Get failure statistics
server.tool(
  "get_failure_stats",
  "Get CI failure statistics for the last N days",
  {
    days: z.number().default(7).describe("Number of days to look back"),
    workflow: z.string().optional().describe("Filter by workflow name"),
  },
  async ({ days, workflow }) => {
    const stats = await queryFailureStats(days, workflow);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          totalRuns: stats.total,
          failures: stats.failures,
          failureRate: `${((stats.failures / stats.total) * 100).toFixed(1)}%`,
          topFailures: stats.topFailures,
          avgRecoveryTime: `${stats.avgRecoveryMinutes} minutes`,
          flakeRate: `${stats.flakeRate}%`,
        }, null, 2),
      }],
    };
  },
);

// Tool: Get flaky test report
server.tool(
  "get_flaky_tests",
  "Identify tests that intermittently fail",
  {
    threshold: z.number().default(3).describe("Minimum failure count to be considered flaky"),
    days: z.number().default(30).describe("Lookback period in days"),
  },
  async ({ threshold, days }) => {
    const flaky = await queryFlakyTests(threshold, days);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          flakyTests: flaky.map(t => ({
            testName: t.name,
            file: t.file,
            failures: t.failureCount,
            totalRuns: t.totalRuns,
            flakeRate: `${((t.failureCount / t.totalRuns) * 100).toFixed(1)}%`,
            lastFailed: t.lastFailedAt,
            commonErrors: t.commonErrors,
          })),
        }, null, 2),
      }],
    };
  },
);

// Tool: Get deployment history
server.tool(
  "get_deploy_history",
  "Get recent deployment history with success/failure status",
  {
    environment: z.enum(["staging", "production"]).describe("Deployment environment"),
    limit: z.number().default(10).describe("Number of deployments to return"),
  },
  async ({ environment, limit }) => {
    const deploys = await queryDeployHistory(environment, limit);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          environment,
          deployments: deploys.map(d => ({
            sha: d.sha.slice(0, 7),
            status: d.status,
            timestamp: d.createdAt,
            duration: `${d.durationSeconds}s`,
            author: d.author,
          })),
        }, null, 2),
      }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Configuring the MCP Server

Add the server to your VS Code MCP configuration:

```json
{
  "mcpServers": {
    "ci-metrics": {
      "command": "node",
      "args": ["mcp-servers/ci-metrics/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}",
        "REPO_OWNER": "your-org",
        "REPO_NAME": "your-repo"
      }
    }
  }
}
```

Now Copilot can query CI metrics during diagnosis:

```
@workspace Using the ci-metrics MCP server, check the failure rate
for the last 7 days and identify any flaky tests. Then suggest
whether this failure is a flake or a real regression.
```

---

## Automated Rollback Systems

When a deployment causes production issues, automated rollback limits the blast radius.

### Rollback on Health Check Failure

```yaml
# .github/workflows/deploy-with-rollback.yml
name: Deploy with Auto-Rollback

on:
  push:
    branches: [main]

permissions:
  contents: read
  deployments: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Store rollback SHA
        id: rollback
        run: echo "sha=$(git rev-parse HEAD~1)" >> "$GITHUB_OUTPUT"

      - name: Deploy current version
        id: deploy
        run: |
          # Your deployment command
          echo "Deploying ${{ github.sha }}..."

      - name: Health check (with retries)
        id: health
        run: |
          MAX_RETRIES=5
          RETRY_DELAY=15
          for i in $(seq 1 $MAX_RETRIES); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
              --max-time 10 \
              https://example.com/health)

            if [ "$STATUS" = "200" ]; then
              echo "✅ Health check passed on attempt $i"
              echo "healthy=true" >> "$GITHUB_OUTPUT"
              exit 0
            fi

            echo "⏳ Attempt $i/$MAX_RETRIES failed (HTTP $STATUS). Retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
          done

          echo "❌ Health check failed after $MAX_RETRIES attempts"
          echo "healthy=false" >> "$GITHUB_OUTPUT"

      - name: Rollback on failure
        if: steps.health.outputs.healthy == 'false'
        run: |
          echo "🔄 Rolling back to ${{ steps.rollback.outputs.sha }}..."
          # Deploy the previous commit
          git checkout ${{ steps.rollback.outputs.sha }}
          # Re-run deployment with previous version

      - name: Notify on rollback
        if: steps.health.outputs.healthy == 'false'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🔄 Auto-rollback triggered for ${context.sha.slice(0, 7)}`,
              body: `## Automatic Rollback\n\n` +
                `**Failed commit:** \`${context.sha}\`\n` +
                `**Rolled back to:** \`${{ steps.rollback.outputs.sha }}\`\n` +
                `**Reason:** Health check failed after 5 attempts\n\n` +
                `Please investigate the failed deployment.`,
              labels: ['rollback', 'production', 'urgent'],
            });
```

---

## Multi-Repo Orchestration

For organizations with microservices, coordinate deployments across multiple repositories.

### Cross-Repo Deployment Trigger

```yaml
# .github/workflows/orchestrate-deploy.yml
name: Orchestrate Multi-Repo Deploy

on:
  workflow_dispatch:
    inputs:
      services:
        description: "Comma-separated service names to deploy"
        required: true
        type: string
      environment:
        description: "Target environment"
        required: true
        type: choice
        options: [staging, production]

permissions:
  contents: read

jobs:
  orchestrate:
    runs-on: ubuntu-latest
    strategy:
      max-parallel: 1
      matrix:
        service: ${{ fromJSON(format('["{0}"]', join(fromJSON(format('["{0}"]', replace(inputs.services, ',', '","'))), '","'))) }}
    steps:
      - name: Trigger deployment for ${{ matrix.service }}
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.CROSS_REPO_TOKEN }}
          script: |
            await github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner,
              repo: '${{ matrix.service }}',
              workflow_id: 'deploy.yml',
              ref: 'main',
              inputs: {
                environment: '${{ inputs.environment }}',
                triggered_by: `${context.repo.repo}@${context.sha.slice(0, 7)}`,
              },
            });
            console.log(`Triggered deploy for ${{ matrix.service }}`);

      - name: Wait for deployment
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.CROSS_REPO_TOKEN }}
          script: |
            // Poll for deployment status
            const maxWait = 300; // 5 minutes
            const interval = 15; // 15 seconds
            let elapsed = 0;

            while (elapsed < maxWait) {
              const { data: runs } = await github.rest.actions.listWorkflowRuns({
                owner: context.repo.owner,
                repo: '${{ matrix.service }}',
                workflow_id: 'deploy.yml',
                per_page: 1,
              });

              const latest = runs.workflow_runs[0];
              if (latest.status === 'completed') {
                if (latest.conclusion === 'success') {
                  console.log(`✅ ${{ matrix.service }} deployed successfully`);
                  return;
                }
                throw new Error(`❌ ${{ matrix.service }} deployment failed`);
              }

              console.log(`⏳ Waiting for ${{ matrix.service }}... (${elapsed}s)`);
              await new Promise(r => setTimeout(r, interval * 1000));
              elapsed += interval;
            }
            throw new Error(`⏰ ${{ matrix.service }} deployment timed out`);
```

---

## Production Considerations

### Rate Limits and Cost Management

| Resource | Limit | Mitigation |
|----------|-------|-----------|
| GitHub API requests | 5,000/hour (authenticated) | Cache responses, batch requests |
| Actions minutes | Plan-dependent | Smart test selection, cancel stale runs |
| Copilot agent invocations | Plan-dependent | Circuit breakers, batch issues |
| Webhook deliveries | 10,000/repository | Filter events, use `workflow_run` |

### Security Guardrails

```yaml
# .github/CODEOWNERS — require approval for auto-fix PRs
# Auto-fix PRs must be reviewed by a human
/.github/workflows/ @platform-team
auto-fix/** @security-team @platform-team
```

### Observability Dashboard

Track these metrics to measure your self-healing system's effectiveness:

| Metric | Target | Description |
|--------|--------|-------------|
| Mean Time to Detect (MTTD) | < 2 min | Time from failure to detection |
| Mean Time to Fix (MTTF) | < 15 min | Time from detection to fix PR |
| Auto-Fix Success Rate | > 60% | Percentage of fixes that pass CI |
| False Positive Rate | < 5% | Fixes that introduce new issues |
| Circuit Breaker Trips | < 2/week | Runaway auto-fix attempts |
| Manual Intervention Rate | < 40% | Failures requiring human action |

---

## 🏋️ Capstone: Build Autonomous CI/CD

### Scenario

Build a complete self-healing CI/CD system for a TypeScript web application.

### Deliverables

1. **Failure Detector** — Workflow that catches CI failures and creates diagnostic issues
2. **Diagnostic Agent** — Copilot instructions for analyzing and fixing failures
3. **Auto-Fix Pipeline** — Workflow that attempts common fixes (lint, deps, types)
4. **Circuit Breaker** — Safety mechanism preventing infinite fix loops
5. **Rollback System** — Auto-rollback on post-deploy health check failure
6. **CI Metrics MCP Server** — Real-time failure stats and flaky test detection

### Suggested Repository Structure

```
.github/
├── copilot-instructions.md         # Agent diagnosis instructions
├── CODEOWNERS                      # Review requirements for auto-fixes
├── dependabot.yml                  # Automated dependency updates
└── workflows/
    ├── ci.yml                      # Main CI pipeline
    ├── detect-failures.yml         # Stage 1: Failure detection
    ├── auto-fix.yml                # Stage 3: Auto-fix generation
    ├── deploy-with-rollback.yml    # Deploy + auto-rollback
    └── orchestrate-deploy.yml      # Multi-repo coordination
mcp-servers/
└── ci-metrics/
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── index.ts                # MCP server for CI metrics
```

### Validation Criteria

- ✅ Failure detector creates issues within 2 minutes of CI failure
- ✅ Auto-fix resolves lint and dependency errors without human help
- ✅ Circuit breaker stops after 3 failed attempts within 1 hour
- ✅ Rollback triggers within 90 seconds of health check failure
- ✅ MCP server returns accurate failure statistics
- ✅ All workflows have `permissions:` explicitly set (least privilege)
- ✅ CODEOWNERS enforces review for auto-generated PRs

---

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Self-Healing CI/CD** | A pipeline that automatically detects, diagnoses, and fixes failures |
| **Circuit Breaker** | A safety mechanism that stops automated actions after repeated failures |
| **MCP Server** | A Model Context Protocol server that provides tools and data to Copilot |
| **MTTD** | Mean Time to Detect — how quickly failures are identified |
| **MTTF** | Mean Time to Fix — how quickly failures are resolved |
| **Rollback** | Reverting a deployment to a previous known-good version |
| **Flaky Test** | A test that intermittently fails without code changes |
| **Canary Deployment** | Releasing to a small subset of users before full rollout |

---

## ➡️ Next Steps

- **Related:** [Large-Scale Legacy Modernization with Copilot Agents](/Learn-GHCP/courses/technology/refactoring-advanced/) — use self-healing pipelines during migration
- **Related:** [Multi-Agent Orchestration and Self-Healing CI](/Learn-GHCP/courses/agents/copilot-agents-advanced/) — advanced multi-agent architectures
- **Start from the beginning:** [GitHub Actions with Copilot: AI-Generated Workflows](/Learn-GHCP/courses/technology/github-actions-ai-beginner/)
