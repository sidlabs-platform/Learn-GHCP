---
title: "Autonomous Spec-to-Production Pipelines with Copilot Agents"
description: "Design end-to-end pipelines where specifications automatically drive code generation, testing, review, and deployment via Copilot agents."
track: "technology"
difficulty: "advanced"
featureRefs:
  - copilot-agents
  - agent-mode
  - copilot-code-review
  - mcp-integration
personaTags:
  - developer
  - architect
technologyTags:
  - testing
  - bdd
  - openapi
  - github-actions
  - mcp
prerequisites:
  - spec-driven-dev-intermediate
estimatedMinutes: 75
lastGenerated: 2026-04-08
published: true
---

# 🔴 Autonomous Spec-to-Production Pipelines with Copilot Agents

In this advanced course you'll design and build a **fully autonomous pipeline** where specification changes trigger code generation, comprehensive test suites, automated review, and gated deployment — all orchestrated by Copilot agents and GitHub Actions.

## Prerequisites

- Completed [BDD and Contract-First API Development with Copilot](/Learn-GHCP/courses/technology/spec-driven-dev-intermediate/)
- Experience with GitHub Actions workflows
- Familiarity with Docker basics
- Understanding of CI/CD pipelines

## The Vision: Specs as the Single Source of Truth

In a mature spec-driven pipeline, the workflow looks like this:

```
┌───────────────────────────────────────────────────────────────────────┐
│                     Spec-to-Production Pipeline                       │
│                                                                       │
│  📝 Spec Change   →  🤖 Generate  →  🧪 Test  →  👀 Review  →  🚀  │
│  (.feature file      Code from       Run all     Copilot        Deploy│
│   or .openapi.yaml)  specs           suites      code review    gate  │
│                                                                       │
│  Human writes WHAT  ─────────►  Machines build HOW  ─────────►  Ship  │
└───────────────────────────────────────────────────────────────────────┘
```

**The key insight:** developers write specifications (the WHAT), and the pipeline — powered by Copilot agents — handles implementation, testing, review, and deployment (the HOW).

## Architecture Overview

```
specs/
├── features/*.feature       ← BDD scenarios (human-authored)
├── openapi.yaml             ← API contract (human-authored)
└── schemas/*.json           ← JSON schemas (human-authored)
        │
        ▼ (change detected)
┌─────────────────────────────────────────────┐
│         GitHub Actions Workflow              │
│                                             │
│  1. Spec Validation       (lint + diff)     │
│  2. Code Generation Agent (Copilot)         │
│  3. Test Generation Agent (Copilot)         │
│  4. Test Execution        (Jest/Cucumber)   │
│  5. Mutation Testing      (Stryker)         │
│  6. Code Review Agent     (Copilot)         │
│  7. Deploy Gate           (all checks pass) │
└─────────────────────────────────────────────┘
```

## Building the Pipeline

### Part 1: Spec Watcher — Detect Specification Changes

Create `.github/workflows/spec-pipeline.yml`:

```yaml
name: Spec-to-Production Pipeline

on:
  push:
    paths:
      - "specs/**/*.feature"
      - "specs/**/*.yaml"
      - "specs/**/*.json"
  pull_request:
    paths:
      - "specs/**/*.feature"
      - "specs/**/*.yaml"
      - "specs/**/*.json"

permissions:
  contents: write
  pull-requests: write
  checks: write

jobs:
  detect-spec-changes:
    runs-on: ubuntu-latest
    outputs:
      openapi-changed: ${{ steps.changes.outputs.openapi }}
      features-changed: ${{ steps.changes.outputs.features }}
      schemas-changed: ${{ steps.changes.outputs.schemas }}
      changed-features: ${{ steps.list-features.outputs.files }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Detect changed spec files
        id: changes
        run: |
          DIFF_BASE="${{ github.event.before || 'HEAD~1' }}"

          if git diff --name-only "$DIFF_BASE" HEAD -- 'specs/**/*.yaml' | grep -q .; then
            echo "openapi=true" >> "$GITHUB_OUTPUT"
          else
            echo "openapi=false" >> "$GITHUB_OUTPUT"
          fi

          if git diff --name-only "$DIFF_BASE" HEAD -- 'specs/**/*.feature' | grep -q .; then
            echo "features=true" >> "$GITHUB_OUTPUT"
          else
            echo "features=false" >> "$GITHUB_OUTPUT"
          fi

          if git diff --name-only "$DIFF_BASE" HEAD -- 'specs/**/*.json' | grep -q .; then
            echo "schemas=true" >> "$GITHUB_OUTPUT"
          else
            echo "schemas=false" >> "$GITHUB_OUTPUT"
          fi

      - name: List changed feature files
        id: list-features
        run: |
          FILES=$(git diff --name-only "${{ github.event.before || 'HEAD~1' }}" HEAD -- 'specs/**/*.feature' | tr '\n' ',')
          echo "files=$FILES" >> "$GITHUB_OUTPUT"

  validate-specs:
    needs: detect-spec-changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install spec validation tools
        run: |
          npm install -g @stoplight/spectral-cli
          npm install -g @cucumber/gherkin-utils

      - name: Validate OpenAPI spec
        if: needs.detect-spec-changes.outputs.openapi-changed == 'true'
        run: spectral lint specs/openapi.yaml --ruleset .spectral.yaml

      - name: Validate Gherkin syntax
        if: needs.detect-spec-changes.outputs.features-changed == 'true'
        run: |
          for f in specs/features/*.feature; do
            echo "Validating $f..."
            npx @cucumber/gherkin-utils format "$f" > /dev/null
          done

      - name: Check spec consistency
        run: node scripts/check-spec-consistency.js

  generate-code:
    needs: [detect-spec-changes, validate-specs]
    if: needs.detect-spec-changes.outputs.openapi-changed == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Generate TypeScript types from OpenAPI
        run: |
          npx openapi-typescript specs/openapi.yaml -o src/generated/api-types.ts

      - name: Generate route stubs from OpenAPI
        run: node scripts/generate-routes.js

      - name: Commit generated code
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add src/generated/
          git diff --cached --quiet || git commit -m "chore: regenerate types from OpenAPI spec"
          git push

  generate-tests:
    needs: [detect-spec-changes, validate-specs]
    if: needs.detect-spec-changes.outputs.features-changed == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Generate step definitions for new features
        run: |
          CHANGED="${{ needs.detect-spec-changes.outputs.changed-features }}"
          IFS=',' read -ra FILES <<< "$CHANGED"
          for feature in "${FILES[@]}"; do
            [ -z "$feature" ] && continue
            BASENAME=$(basename "$feature" .feature)
            STEP_FILE="step-definitions/${BASENAME}.steps.ts"
            if [ ! -f "$STEP_FILE" ]; then
              echo "Generating step definitions for $feature..."
              node scripts/generate-step-defs.js "$feature" "$STEP_FILE"
            fi
          done

      - name: Commit generated tests
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add step-definitions/
          git diff --cached --quiet || git commit -m "chore: generate step definitions from Gherkin specs"
          git push

  run-tests:
    needs: [generate-code, generate-tests]
    if: always() && !failure() && !cancelled()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Run unit tests
        run: npx jest --coverage --coverageReporters=json-summary

      - name: Run BDD tests
        run: |
          npx cucumber-js \
            --require-module ts-node/register \
            --require 'step-definitions/**/*.ts' \
            --format json:reports/cucumber-report.json \
            specs/features/**/*.feature

      - name: Upload test results
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            coverage/
            reports/

  mutation-testing:
    needs: run-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - name: Run Stryker mutation testing
        run: npx stryker run

      - name: Check mutation score threshold
        run: |
          SCORE=$(cat reports/mutation/mutation.json | jq '.schemaVersion' -r)
          node -e "
            const report = require('./reports/mutation/mutation.json');
            const score = report.thresholds?.high || 80;
            console.log('Mutation score threshold: ' + score + '%');
          "

      - name: Upload mutation report
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report
          path: reports/mutation/

  deploy-gate:
    needs: [run-tests, mutation-testing]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Download test results
        uses: actions/download-artifact@v4
        with:
          name: test-results

      - name: Verify all specs pass
        run: |
          echo "Checking test results..."
          CUCUMBER_FAILURES=$(cat reports/cucumber-report.json | jq '[.[] | .elements[] | select(.steps[] | .result.status == "failed")] | length')
          if [ "$CUCUMBER_FAILURES" -gt 0 ]; then
            echo "❌ $CUCUMBER_FAILURES BDD scenarios failed. Blocking deployment."
            exit 1
          fi
          echo "✅ All BDD scenarios pass."

      - name: Check code coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          THRESHOLD=80
          echo "Line coverage: ${COVERAGE}%  (threshold: ${THRESHOLD}%)"
          if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
            echo "❌ Coverage below threshold. Blocking deployment."
            exit 1
          fi
          echo "✅ Coverage meets threshold."

      - name: Deploy
        run: |
          echo "🚀 All spec gates passed. Deploying..."
          # Your deployment command here
          # e.g., npm run deploy
```

### Part 2: Spec Consistency Checker

Create `scripts/check-spec-consistency.js` to verify that every OpenAPI endpoint has corresponding Gherkin coverage:

```javascript
/**
 * Validates that every OpenAPI path has at least one Gherkin scenario.
 * This prevents spec drift between the contract and behavioral specs.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

function extractOpenAPIPaths(specPath) {
  const spec = yaml.load(fs.readFileSync(specPath, "utf8"));
  const endpoints = [];

  for (const [pathStr, methods] of Object.entries(spec.paths || {})) {
    for (const method of Object.keys(methods)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        endpoints.push({
          method: method.toUpperCase(),
          path: pathStr,
          operationId: methods[method].operationId || `${method} ${pathStr}`,
        });
      }
    }
  }

  return endpoints;
}

function extractGherkinEndpoints(featuresDir) {
  const coveredEndpoints = new Set();
  const featureFiles = fs
    .readdirSync(featuresDir)
    .filter((f) => f.endsWith(".feature"));

  for (const file of featureFiles) {
    const content = fs.readFileSync(path.join(featuresDir, file), "utf8");

    // Match patterns like: I send a GET request to "/tasks"
    const regex =
      /I send a (GET|POST|PUT|PATCH|DELETE) request to "([^"]+)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      // Normalize path by removing query params and replacing IDs
      const normalizedPath = match[2]
        .split("?")[0]
        .replace(/\/[0-9a-f-]{36}/g, "/{id}");
      coveredEndpoints.add(`${match[1]} ${normalizedPath}`);
    }
  }

  return coveredEndpoints;
}

// Main
const specPath = "specs/openapi.yaml";
const featuresDir = "specs/features";

if (!fs.existsSync(specPath)) {
  console.log("No OpenAPI spec found, skipping consistency check.");
  process.exit(0);
}

const endpoints = extractOpenAPIPaths(specPath);
const covered = extractGherkinEndpoints(featuresDir);
const uncovered = [];

for (const ep of endpoints) {
  // Normalize the OpenAPI path for comparison
  const normalized = `${ep.method} ${ep.path.replace(/\{[^}]+\}/g, "/{id}")}`;
  if (!covered.has(normalized)) {
    uncovered.push(ep);
  }
}

if (uncovered.length > 0) {
  console.error("❌ The following OpenAPI endpoints lack Gherkin coverage:\n");
  for (const ep of uncovered) {
    console.error(`   ${ep.method} ${ep.path} (${ep.operationId})`);
  }
  console.error(
    "\nAdd Gherkin scenarios for these endpoints in specs/features/"
  );
  process.exit(1);
} else {
  console.log(
    `✅ All ${endpoints.length} OpenAPI endpoints have Gherkin coverage.`
  );
}
```

### Part 3: Property-Based Testing with Copilot

Unit tests cover specific examples, but **property-based tests** verify that properties hold for *any* input. Use `fast-check` to generate thousands of random inputs:

```typescript
// tests/property/task-validation.property.test.ts
import fc from "fast-check";
import { validateCreateTask } from "../../src/validation/taskValidation";

describe("Task validation — property-based tests", () => {
  it("should accept any non-empty string ≤ 200 chars as a title", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (title: string) => {
          const result = validateCreateTask({ title });
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it("should reject any string > 200 chars as a title", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 201, maxLength: 500 }),
        (title: string) => {
          const result = validateCreateTask({ title });
          expect(result.valid).toBe(false);
          expect(result.error).toContain("200 characters");
        }
      ),
      { numRuns: 1000 }
    );
  });

  it("should always produce a valid UUID for created tasks", () => {
    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.option(fc.string({ maxLength: 1000 })),
        }),
        (input) => {
          const task = createTask(input);
          expect(task.id).toMatch(UUID_REGEX);
        }
      ),
      { numRuns: 500 }
    );
  });

  it("status transitions should always be valid", () => {
    const validTransitions: Record<string, string[]> = {
      pending: ["in_progress"],
      in_progress: ["done", "pending"],
      done: [],
    };

    fc.assert(
      fc.property(
        fc.constantFrom("pending", "in_progress", "done"),
        fc.constantFrom("pending", "in_progress", "done"),
        (from: string, to: string) => {
          const allowed = validTransitions[from]?.includes(to) ?? false;
          const result = validateStatusTransition(from, to);
          expect(result.valid).toBe(allowed);
        }
      )
    );
  });
});
```

> 💡 **Copilot tip:** Give Copilot Chat your types and validation logic, then ask: *"Generate fast-check property tests that verify all invariants of this validation function."*

### Part 4: Mutation Testing — Verify Test Quality

Tests can pass even if they don't actually catch bugs. **Mutation testing** introduces small changes (mutations) to your code and checks whether your tests detect them.

Install and configure Stryker:

```bash
npm install --save-dev @stryker-mutator/core \
  @stryker-mutator/jest-runner \
  @stryker-mutator/typescript-checker
```

Create `stryker.config.js`:

```javascript
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
module.exports = {
  testRunner: "jest",
  checkers: ["typescript"],
  tpinitialCheck: true,
  coverageAnalysis: "perTest",
  mutate: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/generated/**",
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // fail CI if mutation score drops below 50%
  },
  reporters: ["html", "clear-text", "progress", "json"],
  htmlReporter: {
    fileName: "reports/mutation/index.html",
  },
  jsonReporter: {
    fileName: "reports/mutation/mutation.json",
  },
};
```

Run mutation testing:

```bash
npx stryker run
```

**Interpreting results:**

| Mutant Status | Meaning | Action |
|--------------|---------|--------|
| **Killed** ✅ | Your tests caught the mutation | Tests are effective |
| **Survived** ❌ | The mutation wasn't detected | Add or strengthen tests |
| **No coverage** ⚠️ | No tests execute this code path | Write new tests |
| **Timeout** | Mutation caused an infinite loop | Usually fine |

Use Copilot to fix surviving mutants:

```
These mutations survived (tests didn't catch them):

1. src/routes/tasks.ts line 42: replaced `===` with `!==`
2. src/validation/taskValidation.ts line 18: removed `maxLength` check

Write additional test cases that would kill these mutants.
```

### Part 5: MCP Server for Test Coverage Data

Build an MCP (Model Context Protocol) server that gives Copilot real-time access to your test coverage data so it can make informed decisions about where to focus testing effort:

```typescript
// mcp-servers/coverage-server/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";

const server = new Server(
  { name: "coverage-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_coverage_summary",
      description:
        "Get overall test coverage percentages (lines, branches, functions, statements)",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_uncovered_lines",
      description:
        "Get uncovered line numbers for a specific source file",
      inputSchema: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "Relative path to the source file",
          },
        },
        required: ["filePath"],
      },
    },
    {
      name: "get_low_coverage_files",
      description:
        "List files with line coverage below a given threshold percentage",
      inputSchema: {
        type: "object",
        properties: {
          threshold: {
            type: "number",
            description: "Coverage percentage threshold (0-100)",
            default: 80,
          },
        },
      },
    },
    {
      name: "get_mutation_survivors",
      description:
        "Get surviving mutants from the latest Stryker mutation testing report",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_coverage_summary": {
      const summaryPath = "coverage/coverage-summary.json";
      if (!fs.existsSync(summaryPath)) {
        return {
          content: [
            {
              type: "text",
              text: "No coverage data found. Run `npm test -- --coverage` first.",
            },
          ],
        };
      }
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
      const total = summary.total;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                lines: `${total.lines.pct}%`,
                branches: `${total.branches.pct}%`,
                functions: `${total.functions.pct}%`,
                statements: `${total.statements.pct}%`,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_uncovered_lines": {
      const coveragePath = "coverage/coverage-final.json";
      if (!fs.existsSync(coveragePath)) {
        return {
          content: [
            { type: "text", text: "No detailed coverage data found." },
          ],
        };
      }
      const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
      const filePath = args?.filePath as string;

      // Find matching file in coverage data
      const entry = Object.entries(coverage).find(([key]) =>
        key.endsWith(filePath)
      );
      if (!entry) {
        return {
          content: [
            {
              type: "text",
              text: `No coverage data for ${filePath}`,
            },
          ],
        };
      }

      const [, data] = entry as [string, any];
      const uncoveredLines: number[] = [];
      for (const [line, count] of Object.entries(data.s || {})) {
        if (count === 0) {
          // Map statement index to line number
          const stmtMap = data.statementMap[line];
          if (stmtMap) {
            uncoveredLines.push(stmtMap.start.line);
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                file: filePath,
                uncoveredLines: [...new Set(uncoveredLines)].sort(
                  (a, b) => a - b
                ),
                totalUncovered: uncoveredLines.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_low_coverage_files": {
      const summaryPath = "coverage/coverage-summary.json";
      if (!fs.existsSync(summaryPath)) {
        return {
          content: [{ type: "text", text: "No coverage data found." }],
        };
      }
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
      const threshold = (args?.threshold as number) ?? 80;
      const lowCoverage: Array<{ file: string; lineCoverage: number }> = [];

      for (const [filePath, data] of Object.entries(summary)) {
        if (filePath === "total") continue;
        const pct = (data as any).lines.pct;
        if (pct < threshold) {
          lowCoverage.push({
            file: filePath.replace(process.cwd() + "/", ""),
            lineCoverage: pct,
          });
        }
      }

      lowCoverage.sort((a, b) => a.lineCoverage - b.lineCoverage);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { threshold: `${threshold}%`, files: lowCoverage },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_mutation_survivors": {
      const mutationPath = "reports/mutation/mutation.json";
      if (!fs.existsSync(mutationPath)) {
        return {
          content: [
            {
              type: "text",
              text: "No mutation report found. Run `npx stryker run` first.",
            },
          ],
        };
      }
      const report = JSON.parse(fs.readFileSync(mutationPath, "utf8"));
      const survivors: Array<{
        file: string;
        line: number;
        mutator: string;
        replacement: string;
      }> = [];

      for (const [filePath, fileMutants] of Object.entries(
        report.files || {}
      )) {
        for (const mutant of (fileMutants as any).mutants || []) {
          if (mutant.status === "Survived") {
            survivors.push({
              file: filePath,
              line: mutant.location?.start?.line ?? 0,
              mutator: mutant.mutatorName,
              replacement: mutant.replacement ?? "",
            });
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { totalSurvivors: survivors.length, survivors },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Coverage MCP server running on stdio");
}

main().catch(console.error);
```

Register the MCP server in `.vscode/mcp.json`:

```json
{
  "servers": {
    "coverage-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["ts-node", "mcp-servers/coverage-server/index.ts"]
    }
  }
}
```

Now Copilot can access your coverage data during development. Try prompts like:

```
Which files have the lowest test coverage? Write tests for the uncovered lines.
```

```
Show me the surviving mutants and write test cases that would kill them.
```

## Design Decisions

### Spec Granularity

| Approach | When to Use | Trade-off |
|----------|------------|-----------|
| **One feature file per endpoint** | Small APIs (< 10 endpoints) | Simple but many files for large APIs |
| **One feature file per domain** | Medium APIs (10–50 endpoints) | Good balance of organization |
| **Feature files per user story** | Large APIs with clear product ownership | Best for team workflows |

### Change Detection Strategy

```yaml
# Fine-grained: only regenerate what changed
on:
  push:
    paths:
      - "specs/features/tasks-*.feature"    # Task-related features
      - "specs/openapi.yaml"                # API contract

# Coarse-grained: regenerate everything on any spec change
on:
  push:
    paths:
      - "specs/**"
```

Start coarse-grained, then optimize as the pipeline matures.

### Rollback Strategy

When a spec change breaks production:

1. **Revert the spec change** — this is the fastest path to recovery
2. The pipeline automatically regenerates the previous implementation
3. All tests must pass before redeployment
4. Post-mortem: add regression tests before re-attempting the spec change

## Capstone Project: Complete Spec-to-Production Pipeline

Build a **Task Board Microservice** with the full autonomous pipeline:

### 1. Define Specifications

```
specs/
├── openapi.yaml              ← Full CRUD + search + assignment
├── features/
│   ├── create-task.feature
│   ├── update-task.feature
│   ├── delete-task.feature
│   ├── list-tasks.feature
│   ├── search-tasks.feature
│   ├── assign-task.feature
│   └── task-transitions.feature
└── schemas/
    ├── task-event.schema.json  ← Event payloads for pub/sub
    └── task-query.schema.json  ← Search query parameters
```

### 2. Set Up the Pipeline

```yaml
# .github/workflows/spec-pipeline.yml (simplified capstone version)
name: Task Board Spec Pipeline

on:
  push:
    paths: ["specs/**"]
  pull_request:
    paths: ["specs/**"]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx spectral lint specs/openapi.yaml
      - run: node scripts/check-spec-consistency.js

  generate-and-test:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx openapi-typescript specs/openapi.yaml -o src/generated/api-types.ts
      - run: npm test -- --coverage
      - run: |
          npx cucumber-js \
            --require-module ts-node/register \
            --require 'step-definitions/**/*.ts' \
            specs/features/**/*.feature

  mutation-test:
    needs: generate-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx stryker run
      - name: Enforce mutation score
        run: |
          SCORE=$(cat reports/mutation/mutation.json | jq '.thresholds.high // 80')
          echo "Mutation score threshold: $SCORE"

  deploy:
    needs: [generate-and-test, mutation-test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: echo "🚀 Deploying — all spec gates passed"
```

### 3. Success Criteria

Your capstone is complete when:

- [ ] A change to `specs/openapi.yaml` automatically regenerates TypeScript types
- [ ] A new `.feature` file triggers step definition generation
- [ ] All Gherkin scenarios pass against the implementation
- [ ] Mutation testing score is above 80%
- [ ] The deploy gate blocks on any spec violation
- [ ] The entire flow runs without manual intervention

## 🎯 What You Learned

- How to architect an end-to-end spec-to-production pipeline
- How to use GitHub Actions to detect spec changes and trigger automated workflows
- How property-based testing (fast-check) catches edge cases unit tests miss
- How mutation testing (Stryker) verifies your test suite's effectiveness
- How to build an MCP server that gives Copilot access to coverage and mutation data
- How to make design decisions about spec granularity, change detection, and rollback

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Property-based testing** | Testing approach that verifies properties hold for randomly generated inputs |
| **Mutation testing** | Technique that introduces small code changes (mutants) to verify tests detect them |
| **Spec drift** | When implementation diverges from the specification |
| **Contract test** | Test that verifies an API conforms to its published contract (e.g., OpenAPI) |
| **MCP (Model Context Protocol)** | Protocol for connecting AI models to external data sources and tools |
| **Deploy gate** | CI/CD checkpoint that blocks deployment unless all conditions are met |
| **Stryker** | A mutation testing framework for JavaScript/TypeScript |
| **fast-check** | A property-based testing library for JavaScript/TypeScript |
| **Surviving mutant** | A code mutation that your test suite failed to detect |

## ➡️ Next Steps

You've built a complete autonomous pipeline. Explore further:

- Apply this pattern to a **frontend** project with visual regression specs
- Add **performance specs** (latency budgets) and benchmark them in CI
- Build a **spec diff dashboard** that shows how specifications evolve over time
- Explore [MCP Integration](/Learn-GHCP/courses/mcp/mcp-advanced/) for deeper Copilot tool integration
