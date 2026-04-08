---
title: "SAST/DAST Patterns with Copilot"
description: "Build security scanning workflows, compliance checks, and automated vulnerability remediation using Copilot."
track: "persona"
difficulty: "intermediate"
featureRefs:
  - copilot-chat
  - agent-mode
  - copilot-code-review
personaTags:
  - security-engineer
technologyTags:
  - security
  - github-actions
  - codeql
  - sast
prerequisites:
  - security-beginner
estimatedMinutes: 45
lastGenerated: 2026-04-08
published: true
---

# 🟡 SAST/DAST Patterns with Copilot

In this intermediate course you'll build production-grade security scanning pipelines, automate vulnerability remediation in pull requests, and enforce compliance policies—all with Copilot as your co-pilot.

## Prerequisites

- Completed [Copilot for Security: Secure Code Suggestions](/Learn-GHCP/courses/persona/security-beginner/)
- Familiarity with GitHub Actions
- A repository with GitHub Advanced Security enabled

## Step 1: Building SAST Workflows with CodeQL and Copilot

Use Copilot to generate a comprehensive CodeQL workflow. Open Copilot Chat and prompt:

```
Create a GitHub Actions workflow that runs CodeQL analysis for JavaScript and Python,
includes custom query suites for OWASP Top 10, and uploads results to the Security tab.
```

**Generated workflow:**

```yaml
# .github/workflows/codeql-analysis.yml
name: "CodeQL Security Analysis"

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday scan

concurrency:
  group: codeql-${{ github.ref }}
  cancel-in-progress: true

jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: [javascript, python]
        include:
          - language: javascript
            build-mode: none
          - language: python
            build-mode: none

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: +security-extended,security-and-quality
          config: |
            query-filters:
              - exclude:
                  tags: /low-severity/

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{ matrix.language }}"
          upload: true
```

## Step 2: Custom CodeQL Queries with Copilot

Ask Copilot to generate custom CodeQL queries for your specific security requirements:

```
Write a CodeQL query for JavaScript that detects API endpoints
missing authentication middleware in an Express.js application.
```

**Custom query — detect unprotected routes:**

```ql
/**
 * @name Unprotected Express route
 * @description Finds Express route handlers that do not use authentication middleware.
 * @kind problem
 * @problem.severity warning
 * @security-severity 7.5
 * @id js/unprotected-route
 * @tags security
 *       owasp-a01
 */

import javascript

class AuthMiddleware extends DataFlow::FunctionNode {
  AuthMiddleware() {
    this.getAParameter().getName() = ["req", "request"] and
    exists(DataFlow::PropRead pr |
      pr.getBase() = this.getAParameter().getALocalSource() and
      pr.getPropertyName() = ["user", "session", "auth"]
    )
  }
}

from DataFlow::CallNode call, string method
where
  call.getCalleeName() = method and
  method.regexpMatch("get|post|put|patch|delete") and
  not exists(AuthMiddleware auth |
    auth.flowsTo(call.getArgument(_))
  )
select call,
  "Route handler '" + method.toUpperCase() + " " +
  call.getArgument(0).getStringValue() +
  "' may be missing authentication middleware."
```

Save custom queries in your repository:

```
.github/
  codeql/
    custom-queries/
      javascript/
        unprotected-routes.ql
        sensitive-data-logging.ql
      python/
        unsafe-deserialization.ql
    codeql-config.yml
```

```yaml
# .github/codeql/codeql-config.yml
name: "Custom Security Queries"
queries:
  - uses: ./.github/codeql/custom-queries
  - uses: security-extended
packs:
  javascript:
    - codeql/javascript-queries
  python:
    - codeql/python-queries
paths-ignore:
  - node_modules
  - '**/test/**'
  - '**/*.test.js'
```

## Step 3: Automated Security PR Reviews

Configure Copilot Code Review to enforce security standards on every pull request:

```yaml
# .github/copilot-code-review.yml
reviews:
  security:
    enabled: true
    severity_threshold: medium
    categories:
      - injection
      - authentication
      - cryptography
      - data-exposure
      - configuration
    auto_comment: true
    block_merge:
      critical: true
      high: true
```

Create a GitHub Actions job that combines Copilot review with security checks:

```yaml
# .github/workflows/security-pr-review.yml
name: Security PR Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write
  security-events: write

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Dependency Review
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
          deny-licenses: GPL-3.0, AGPL-3.0
          comment-summary-in-pr: always

  secret-detection:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Detect secrets in diff
        uses: trufflesecurity/trufflehog@v3
        with:
          extra_args: --only-verified --results=verified

  security-summary:
    needs: [dependency-review, secret-detection]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Post security summary
        uses: actions/github-script@v7
        with:
          script: |
            const depResult = '${{ needs.dependency-review.result }}';
            const secretResult = '${{ needs.secret-detection.result }}';
            const status = (depResult === 'success' && secretResult === 'success')
              ? '✅ All security checks passed'
              : '❌ Security issues detected';

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## 🔒 Security Review Summary\n\n${status}\n\n| Check | Result |\n|-------|--------|\n| Dependency Review | ${depResult} |\n| Secret Detection | ${secretResult} |`
            });
```

## Step 4: Compliance Rule Patterns

Use Copilot agent mode to generate compliance checks for common frameworks:

```
@workspace In agent mode, create a compliance checker that validates our codebase
against SOC 2 Type II requirements for access control and data encryption.
```

**Compliance validation script generated by Copilot:**

```typescript
// scripts/compliance-check.ts
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface ComplianceResult {
  rule: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  framework: string;
}

const results: ComplianceResult[] = [];

// SOC 2 CC6.1 — Logical access security
function checkAccessControl(projectRoot: string): void {
  const authFiles = findFiles(projectRoot, /auth|middleware|guard/i);

  // Check that all API routes use authentication
  const routeFiles = findFiles(projectRoot, /route|controller|handler/i);
  for (const file of routeFiles) {
    const content = readFileSync(file, 'utf-8');
    const hasAuth = /authenticate|authorize|requireAuth|isAuthenticated/i.test(content);
    results.push({
      rule: 'CC6.1 — Route Authentication',
      status: hasAuth ? 'pass' : 'fail',
      details: `${file}: ${hasAuth ? 'Auth middleware detected' : 'No authentication found'}`,
      framework: 'SOC 2 Type II',
    });
  }
}

// SOC 2 CC6.7 — Data encryption
function checkEncryption(projectRoot: string): void {
  const configFiles = findFiles(projectRoot, /config|env|settings/i);
  for (const file of configFiles) {
    const content = readFileSync(file, 'utf-8');
    const hasWeakCrypto = /md5|sha1|des\b|rc4/i.test(content);
    const hasTLS = /https|tls|ssl|encrypt/i.test(content);

    if (hasWeakCrypto) {
      results.push({
        rule: 'CC6.7 — Encryption Standards',
        status: 'fail',
        details: `${file}: Weak cryptographic algorithm detected`,
        framework: 'SOC 2 Type II',
      });
    }
    if (hasTLS) {
      results.push({
        rule: 'CC6.7 — Transport Encryption',
        status: 'pass',
        details: `${file}: TLS/encryption configuration found`,
        framework: 'SOC 2 Type II',
      });
    }
  }
}

function findFiles(dir: string, pattern: RegExp): string[] {
  const matches: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (entry.isFile() && pattern.test(entry.name)) {
      matches.push(join(entry.parentPath ?? dir, entry.name));
    }
  }
  return matches;
}

// Run checks
const root = process.argv[2] || '.';
checkAccessControl(root);
checkEncryption(root);

// Report
console.table(results);
const failures = results.filter(r => r.status === 'fail');
if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} compliance failures detected`);
  process.exit(1);
} else {
  console.log('\n✅ All compliance checks passed');
}
```

## Step 5: Dependency Vulnerability Scanning

Create an automated workflow that checks dependencies and generates fix PRs:

```yaml
# .github/workflows/dependency-audit.yml
name: Dependency Vulnerability Audit

on:
  schedule:
    - cron: '0 8 * * *'  # Daily at 8 AM
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run npm audit
        id: audit
        continue-on-error: true
        run: |
          npm audit --json > audit-results.json 2>&1
          CRITICAL=$(jq '.metadata.vulnerabilities.critical // 0' audit-results.json)
          HIGH=$(jq '.metadata.vulnerabilities.high // 0' audit-results.json)
          echo "critical=$CRITICAL" >> $GITHUB_OUTPUT
          echo "high=$HIGH" >> $GITHUB_OUTPUT

      - name: Auto-fix vulnerabilities
        if: steps.audit.outputs.critical > 0 || steps.audit.outputs.high > 0
        run: |
          npm audit fix
          git diff --exit-code || echo "fixes_available=true" >> $GITHUB_OUTPUT

      - name: Create fix PR
        if: steps.audit.outputs.critical > 0 || steps.audit.outputs.high > 0
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          branch: security/dependency-fixes
          title: "🔒 Security: Fix dependency vulnerabilities"
          body: |
            ## Automated Security Fix

            This PR addresses dependency vulnerabilities found by `npm audit`:
            - **Critical:** ${{ steps.audit.outputs.critical }}
            - **High:** ${{ steps.audit.outputs.high }}

            Review the changes and merge to resolve these vulnerabilities.
          commit-message: "fix(security): auto-fix dependency vulnerabilities"
```

## 🎯 Hands-On: Build a Complete Security Scanning Pipeline

Combine everything you've learned into a single pipeline. Use Copilot agent mode:

```
@workspace In agent mode, create a complete security pipeline that includes:
1. CodeQL analysis for JavaScript and Python
2. Dependency vulnerability scanning
3. Secret detection
4. License compliance checking
5. A summary comment on the PR with all results
```

**Your target pipeline structure:**

```
.github/
  workflows/
    security-pipeline.yml       # Main orchestration
  codeql/
    codeql-config.yml           # Custom CodeQL config
    custom-queries/
      javascript/
        unprotected-routes.ql
      python/
        unsafe-deserialization.ql
  copilot-code-review.yml       # Security review config
scripts/
  compliance-check.ts           # Compliance validator
  security-report.ts            # Report generator
```

Verify your pipeline by pushing a test branch with an intentional vulnerability:

```javascript
// test-vuln.js — Push this to trigger security alerts
const express = require('express');
const app = express();

app.get('/api/data', (req, res) => {
  const id = req.query.id;
  const query = `SELECT * FROM data WHERE id = '${id}'`;  // Intentional SQL injection
  res.send(query);
});
```

Your pipeline should catch the SQL injection and block the merge.

## 🎯 What You Learned

- How to build SAST workflows with CodeQL and Copilot
- Writing custom CodeQL queries for your security requirements
- Automating security reviews on pull requests
- Creating compliance checks for SOC 2 and similar frameworks
- Dependency vulnerability scanning with automated fix PRs

## 📚 Glossary

- **SAST**: Static Application Security Testing — analyzes source code without executing it
- **DAST**: Dynamic Application Security Testing — tests running applications for vulnerabilities
- **CodeQL**: GitHub's semantic code analysis engine
- **SOC 2**: Service Organization Control 2 — a compliance framework for data security
- **Dependency review**: Analyzing third-party packages for known vulnerabilities

## ➡️ Next Steps

Ready to build autonomous security agents? Continue to:
- 🔴 [Security Audit Agent Pipeline](/Learn-GHCP/courses/persona/security-advanced/)
