---
title: "Large-Scale Legacy Modernization with Copilot Agents"
description: "Plan and execute large-scale codebase modernization using Copilot agents for automated migration, testing, and validation."
track: "technology"
difficulty: "advanced"
featureRefs:
  - copilot-agents
  - agent-mode
  - copilot-cli
personaTags:
  - architect
  - developer
technologyTags:
  - refactoring
  - legacy
  - migration
  - github-actions
prerequisites:
  - refactoring-intermediate
estimatedMinutes: 75
lastGenerated: 2026-04-08
published: true
---

# 🔴 Large-Scale Legacy Modernization with Copilot Agents

Modernizing a legacy codebase isn't about refactoring one function — it's about migrating thousands of files, translating between languages, upgrading frameworks, and validating that nothing breaks along the way. Copilot agents and automated pipelines make this tractable.

In this course you'll design migration strategies, build automated pipelines, and execute a full legacy-to-modern migration using Copilot agents.

## Prerequisites

- Completed [Design Pattern Migration with Copilot](/Learn-GHCP/courses/technology/refactoring-intermediate/)
- Experience with at least one legacy codebase or framework
- Familiarity with GitHub Actions and CI/CD concepts
- Copilot agent mode enabled

---

## Legacy Modernization Strategy

Before writing a single line of code, you need a migration plan. Ask Copilot to help you assess the scope:

```
Analyze this codebase and create a modernization plan. Identify:
1. Language/framework versions that are end-of-life
2. Deprecated APIs and their modern replacements
3. Files ranked by migration complexity (high/medium/low)
4. Dependencies that need upgrading first (dependency graph order)
5. Suggested migration phases with estimated effort
```

### The Strangler Fig Pattern

The safest approach to large-scale migration is the **Strangler Fig** pattern — incrementally replacing legacy components with modern ones while both systems run side by side.

```
┌─────────────────────────────────────────────┐
│               API Gateway / Router          │
│                                             │
│   ┌──────────────┐   ┌──────────────────┐  │
│   │   Legacy      │   │   Modern          │  │
│   │   System      │   │   System          │  │
│   │              │   │                  │  │
│   │  ┌────────┐  │   │  ┌────────────┐  │  │
│   │  │ Users  │──│──▶│  │ Users (new)│  │  │
│   │  └────────┘  │   │  └────────────┘  │  │
│   │  ┌────────┐  │   │  ┌────────────┐  │  │
│   │  │ Orders │  │   │  │ Orders     │  │  │
│   │  │(legacy)│  │   │  │ (pending)  │  │  │
│   │  └────────┘  │   │  └────────────┘  │  │
│   └──────────────┘   └──────────────────┘  │
│                                             │
│  Phase 1: Users ✅  Phase 2: Orders 🔄     │
└─────────────────────────────────────────────┘
```

### Migration Phases

| Phase | Activity | Copilot Role |
|-------|----------|-------------|
| **Assessment** | Catalog codebase, identify risks | Analyze code, generate reports |
| **Foundation** | Set up modern project, shared types | Scaffold project structure |
| **Incremental Migration** | Migrate module by module | Translate code, generate tests |
| **Validation** | Run both systems, compare output | Generate comparison tests |
| **Cutover** | Switch traffic, remove legacy code | Clean up dead code |

---

## Automated Migration Pipelines

Use GitHub Actions to automate the migration process. This workflow lets Copilot agents migrate files, run tests, and create PRs automatically.

### Migration Workflow

```yaml
# .github/workflows/legacy-migration.yml
name: Legacy Migration Pipeline

on:
  workflow_dispatch:
    inputs:
      module:
        description: "Module to migrate (e.g., users, orders, auth)"
        required: true
        type: string
      target_framework:
        description: "Target framework version"
        required: true
        type: choice
        options:
          - express-v5
          - fastify-v5
          - nestjs-v11
      dry_run:
        description: "Dry run (analyze only, no changes)"
        required: false
        type: boolean
        default: true

jobs:
  analyze:
    name: Analyze Migration Scope
    runs-on: ubuntu-latest
    outputs:
      file_count: ${{ steps.analyze.outputs.file_count }}
      complexity: ${{ steps.analyze.outputs.complexity }}
    steps:
      - uses: actions/checkout@v4

      - name: Analyze module complexity
        id: analyze
        run: |
          MODULE_DIR="src/legacy/${{ inputs.module }}"
          FILE_COUNT=$(find "$MODULE_DIR" -name "*.ts" -o -name "*.js" | wc -l)
          echo "file_count=$FILE_COUNT" >> "$GITHUB_OUTPUT"

          # Estimate complexity based on file count and line count
          TOTAL_LINES=$(find "$MODULE_DIR" -name "*.ts" -o -name "*.js" \
            -exec wc -l {} + | tail -1 | awk '{print $1}')
          if [ "$TOTAL_LINES" -gt 5000 ]; then
            echo "complexity=high" >> "$GITHUB_OUTPUT"
          elif [ "$TOTAL_LINES" -gt 1000 ]; then
            echo "complexity=medium" >> "$GITHUB_OUTPUT"
          else
            echo "complexity=low" >> "$GITHUB_OUTPUT"
          fi

      - name: Generate migration report
        run: |
          echo "## Migration Analysis: ${{ inputs.module }}" >> "$GITHUB_STEP_SUMMARY"
          echo "- Files to migrate: ${{ steps.analyze.outputs.file_count }}" >> "$GITHUB_STEP_SUMMARY"
          echo "- Complexity: ${{ steps.analyze.outputs.complexity }}" >> "$GITHUB_STEP_SUMMARY"
          echo "- Target: ${{ inputs.target_framework }}" >> "$GITHUB_STEP_SUMMARY"

  migrate:
    name: Execute Migration
    needs: analyze
    if: ${{ inputs.dry_run == false }}
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - run: npm ci

      - name: Run migration scripts
        env:
          MODULE: ${{ inputs.module }}
          TARGET: ${{ inputs.target_framework }}
        run: |
          node scripts/migrate.mjs \
            --module "$MODULE" \
            --target "$TARGET" \
            --output "src/modern/$MODULE"

      - name: Run tests on migrated code
        run: |
          npm run test -- --testPathPattern="src/modern/${{ inputs.module }}"

      - name: Create migration PR
        uses: peter-evans/create-pull-request@v6
        with:
          branch: "migrate/${{ inputs.module }}"
          title: "feat: migrate ${{ inputs.module }} to ${{ inputs.target_framework }}"
          body: |
            ## Automated Migration

            **Module:** `${{ inputs.module }}`
            **Target:** `${{ inputs.target_framework }}`
            **Files migrated:** ${{ needs.analyze.outputs.file_count }}
            **Complexity:** ${{ needs.analyze.outputs.complexity }}

            ### Checklist
            - [ ] All tests passing
            - [ ] Manual review of migrated code
            - [ ] Integration tests with dependent modules
            - [ ] Performance benchmarks pass
          labels: migration, automated

  validate:
    name: Validate Migration
    needs: migrate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: "migrate/${{ inputs.module }}"

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - run: npm ci

      - name: Run comparison tests
        run: |
          # Run both legacy and modern modules with same inputs
          node scripts/compare-outputs.mjs \
            --legacy "src/legacy/${{ inputs.module }}" \
            --modern "src/modern/${{ inputs.module }}" \
            --test-data "test/fixtures/${{ inputs.module }}"
```

---

## Language Translation Patterns

Copilot agents can assist with translating code between languages. While not fully automated, they dramatically accelerate the process.

### COBOL → Java Translation

For mainframe modernization, Copilot can translate COBOL business logic to Java:

```
Translate this COBOL paragraph to a Java method. Preserve all business
logic exactly. Map COBOL data types as follows:
- PIC 9(n) → int or long
- PIC 9(n)V9(m) → BigDecimal
- PIC X(n) → String
- Occurs n times → List<T>
Add Javadoc documenting the original COBOL paragraph name.
```

**Example COBOL input:**

```cobol
       CALCULATE-PREMIUM.
           IF CUSTOMER-AGE < 25
               MULTIPLY BASE-RATE BY 1.5 GIVING PREMIUM
           ELSE IF CUSTOMER-AGE > 65
               MULTIPLY BASE-RATE BY 1.3 GIVING PREMIUM
           ELSE
               MOVE BASE-RATE TO PREMIUM
           END-IF.
           IF ACCIDENT-COUNT > 0
               MULTIPLY PREMIUM BY 1.2 GIVING PREMIUM
           END-IF.
           IF POLICY-TYPE = 'COMPREHENSIVE'
               ADD 50.00 TO PREMIUM
           END-IF.
```

**Copilot-generated Java:**

```java
/**
 * Translated from COBOL paragraph CALCULATE-PREMIUM.
 * Calculates insurance premium based on customer age,
 * accident history, and policy type.
 */
public BigDecimal calculatePremium(
    int customerAge,
    BigDecimal baseRate,
    int accidentCount,
    String policyType
) {
    BigDecimal premium;

    if (customerAge < 25) {
        premium = baseRate.multiply(new BigDecimal("1.5"));
    } else if (customerAge > 65) {
        premium = baseRate.multiply(new BigDecimal("1.3"));
    } else {
        premium = baseRate;
    }

    if (accidentCount > 0) {
        premium = premium.multiply(new BigDecimal("1.2"));
    }

    if ("COMPREHENSIVE".equals(policyType)) {
        premium = premium.add(new BigDecimal("50.00"));
    }

    return premium;
}
```

> ⚠️ **Warning:** Always verify translated business logic with domain experts. Copilot may miss subtle COBOL behaviors like implicit truncation or REDEFINES semantics.

### VB6 → C# Translation

```
Translate this VB6 module to C#. Map VB6 types to C# equivalents:
- Variant → object (or appropriate typed alternative)
- Collection → List<T>
- String * n → string (with length validation)
- Currency → decimal
Preserve all error handling (On Error → try/catch).
```

### Translation Validation Strategy

After any language translation, generate comparison tests:

```
Generate a test suite that:
1. Calls the original function with 20 diverse test inputs
2. Calls the translated function with the same inputs
3. Asserts the outputs are identical (within floating-point tolerance for decimals)
4. Includes edge cases: zero, negative, boundary values, null/empty
```

---

## Framework Migration Agents

For framework upgrades (e.g., Express v4 → v5, React class → hooks, Angular upgrades), use Copilot agents with specific migration guides.

### Express v4 → v5 Migration Agent Prompt

```
You are migrating an Express v4 application to Express v5.
Apply these breaking changes to every route file:

1. Replace `res.send(status)` with `res.sendStatus(status)` (number arg removed)
2. Replace `req.param(name)` with `req.params[name]`
3. Replace `req.host` with `req.hostname`
4. Replace `app.param(callback)` with middleware
5. Update path-to-regexp patterns:
   - `/:param?` → `/:param{0,1}` or use `{/:param}` syntax
   - `/route(s)?` → `/routes?` (no regex in paths)
6. Replace `res.redirect(url, status)` with `res.redirect(status, url)` (arg order)
7. Ensure all async route handlers have error handling (Express v5 forwards rejected promises)

For each file, show the changes needed, apply them, and verify the file compiles.
```

### Migration Progress Tracking

Create a migration tracker that Copilot agents update:

```typescript
// scripts/migration-tracker.ts
interface MigrationStatus {
  module: string;
  totalFiles: number;
  migratedFiles: number;
  testsCoverage: number;
  status: "pending" | "in-progress" | "review" | "complete";
  blockers: string[];
}

const tracker: MigrationStatus[] = [
  { module: "auth",     totalFiles: 12, migratedFiles: 12, testsCoverage: 94, status: "complete",    blockers: [] },
  { module: "users",    totalFiles: 8,  migratedFiles: 8,  testsCoverage: 87, status: "review",      blockers: [] },
  { module: "orders",   totalFiles: 23, migratedFiles: 15, testsCoverage: 72, status: "in-progress", blockers: ["payment gateway SDK not yet compatible"] },
  { module: "payments", totalFiles: 15, migratedFiles: 0,  testsCoverage: 0,  status: "pending",     blockers: ["depends on orders migration"] },
  { module: "reports",  totalFiles: 9,  migratedFiles: 0,  testsCoverage: 0,  status: "pending",     blockers: [] },
];
```

---

## Incremental Migration Patterns

### Feature Flags for Gradual Rollout

Use feature flags to route traffic between legacy and modern code:

```typescript
// src/middleware/feature-router.ts
import { FeatureFlags } from "./feature-flags";

export function featureRouter(
  legacyHandler: RequestHandler,
  modernHandler: RequestHandler,
  flagName: string,
): RequestHandler {
  return async (req, res, next) => {
    const useModern = await FeatureFlags.isEnabled(flagName, {
      userId: req.user?.id,
      percentage: req.headers["x-canary"] ? 100 : undefined,
    });

    if (useModern) {
      return modernHandler(req, res, next);
    }
    return legacyHandler(req, res, next);
  };
}

// Usage in routes
import { legacyGetUser } from "../legacy/users";
import { modernGetUser } from "../modern/users";

router.get(
  "/users/:id",
  featureRouter(legacyGetUser, modernGetUser, "modern-user-service"),
);
```

### Parallel Execution for Validation

Run both systems and compare outputs in production (read-only operations):

```typescript
// src/middleware/shadow-traffic.ts
export function shadowCompare<T>(
  primary: () => Promise<T>,
  shadow: () => Promise<T>,
  comparison: (a: T, b: T) => boolean,
  metricName: string,
): () => Promise<T> {
  return async () => {
    const primaryResult = await primary();

    // Fire-and-forget shadow execution
    shadow()
      .then((shadowResult) => {
        const match = comparison(primaryResult, shadowResult);
        metrics.increment(`shadow.${metricName}.${match ? "match" : "mismatch"}`);
        if (!match) {
          logger.warn("Shadow mismatch", {
            metric: metricName,
            primary: primaryResult,
            shadow: shadowResult,
          });
        }
      })
      .catch((err) => {
        metrics.increment(`shadow.${metricName}.error`);
        logger.error("Shadow execution failed", { error: err });
      });

    return primaryResult;
  };
}
```

---

## Validation and Rollback

### Automated Rollback Workflow

```yaml
# .github/workflows/migration-rollback.yml
name: Migration Rollback

on:
  workflow_dispatch:
    inputs:
      module:
        description: "Module to roll back"
        required: true
        type: string
      reason:
        description: "Reason for rollback"
        required: true
        type: string

jobs:
  rollback:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - name: Disable feature flag
        run: |
          curl -X PATCH "$FEATURE_FLAG_API/flags/modern-${{ inputs.module }}" \
            -H "Authorization: Bearer ${{ secrets.FF_TOKEN }}" \
            -d '{"enabled": false}'

      - name: Revert migration PR
        uses: actions/github-script@v7
        with:
          script: |
            const { data: prs } = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'closed',
              head: `migrate/${{ inputs.module }}`,
            });

            if (prs.length > 0) {
              const pr = prs[0];
              await github.rest.pulls.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `revert: rollback ${{ inputs.module }} migration`,
                head: `rollback/${{ inputs.module }}`,
                base: 'main',
                body: `## Rollback\n\n**Module:** ${{ inputs.module }}\n**Reason:** ${{ inputs.reason }}\n**Original PR:** #${pr.number}`,
              });
            }

      - name: Notify team
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "⚠️ Migration rollback: ${{ inputs.module }}\nReason: ${{ inputs.reason }}"
            }
```

### Validation Test Generator

Ask Copilot to generate comprehensive validation tests:

```
Generate a validation test suite that:
1. Calls every public API endpoint with fixture data
2. Records responses from the legacy system
3. Replays the same requests against the modern system
4. Compares response bodies (ignoring timestamp fields)
5. Compares response status codes
6. Reports any mismatches with full diff
7. Measures response time difference (flag if modern is >20% slower)
```

---

## 🏋️ Capstone: Migrate a Legacy Module End-to-End

### Scenario

You have a legacy Express v4 user management module with:

- 6 route handlers (CRUD + search + bulk import)
- Callback-based database access (MongoDB driver v3)
- No TypeScript types
- Manual input validation (string checks)
- No tests

### Deliverables

1. **Migration Plan** — Ask Copilot to analyze the module and generate a phased plan
2. **Modern Module** — TypeScript, async/await, MongoDB driver v6, Zod validation
3. **Feature Flag Router** — Route traffic between legacy and modern
4. **Comparison Tests** — Validate both systems produce identical results
5. **Migration Workflow** — GitHub Actions workflow to automate the process
6. **Rollback Plan** — One-click rollback via workflow dispatch

### Suggested Repository Structure

```
src/
├── legacy/
│   └── users/
│       ├── routes.js          # Original Express v4 routes
│       ├── db.js              # Callback-based MongoDB access
│       └── validation.js      # Manual string validation
├── modern/
│   └── users/
│       ├── routes.ts          # Express v5, async handlers
│       ├── repository.ts      # MongoDB v6, typed queries
│       ├── validation.ts      # Zod schemas
│       └── types.ts           # Shared TypeScript types
├── middleware/
│   ├── feature-router.ts      # Legacy/modern traffic routing
│   └── shadow-compare.ts      # Parallel execution comparison
└── test/
    ├── legacy/users.test.ts   # Snapshot of legacy behavior
    ├── modern/users.test.ts   # Modern module unit tests
    └── comparison/users.test.ts  # Side-by-side comparison
```

### Validation Criteria

- ✅ All legacy API responses exactly reproduced by modern module
- ✅ Modern module uses TypeScript with zero `any` types
- ✅ Feature flags route traffic correctly
- ✅ Rollback workflow reverts to legacy in under 2 minutes
- ✅ Test coverage > 85% on modern module
- ✅ Migration workflow runs end-to-end in CI

---

## Production Considerations

| Concern | Mitigation |
|---------|-----------|
| **Data format changes** | Use adapter layers between legacy and modern data shapes |
| **Database schema migration** | Run schema changes separately; support both formats during transition |
| **Third-party SDK updates** | Pin SDK versions; test new versions in isolation before migration |
| **Performance regression** | Benchmark before/after; set alerting thresholds |
| **Team knowledge gap** | Pair-program migration with Copilot; document decisions in ADRs |

> ⚠️ **Warning:** Never migrate a module without first understanding its actual production behavior. Use observability data (logs, traces, metrics) to validate your assumptions about how the code is used.

---

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Strangler Fig Pattern** | Incrementally replacing legacy components while both old and new systems coexist |
| **Feature Flag** | A runtime toggle that controls which code path executes for a given request |
| **Shadow Traffic** | Running new code in parallel with production code to compare results without affecting users |
| **ADR** | Architecture Decision Record — a document explaining why a technical decision was made |
| **Canary Release** | Deploying new code to a small subset of users before full rollout |
| **Blue-Green Deployment** | Running two identical production environments and switching traffic between them |

---

## ➡️ Next Steps

- **Related:** [Self-Healing CI/CD with Agentic Copilot](/Learn-GHCP/courses/technology/github-actions-ai-advanced/) — build autonomous pipelines that detect and fix migration failures
- **Related:** [Multi-Agent Orchestration and Self-Healing CI](/Learn-GHCP/courses/agents/copilot-agents-advanced/) — orchestrate agents across a multi-repo migration
- **Start from the beginning:** [AI-Assisted Refactoring: Clean Code with Copilot](/Learn-GHCP/courses/technology/refactoring-beginner/)
