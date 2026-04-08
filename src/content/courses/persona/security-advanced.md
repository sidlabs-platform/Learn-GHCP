---
title: "Security Audit Agent Pipeline"
description: "Design an autonomous security audit system using Copilot agents for continuous vulnerability assessment and remediation."
track: "persona"
difficulty: "advanced"
featureRefs:
  - copilot-agents
  - copilot-cli
  - mcp-integration
personaTags:
  - security-engineer
  - architect
technologyTags:
  - security
  - github-actions
  - mcp
  - nodejs
prerequisites:
  - security-intermediate
estimatedMinutes: 75
lastGenerated: 2026-04-08
published: true
---

# 🔴 Security Audit Agent Pipeline

In this advanced course you'll design and build an autonomous security audit system. Using Copilot agents, MCP servers, and GitHub Actions, you'll create a pipeline that continuously discovers, assesses, and remediates vulnerabilities with minimal human intervention.

## Prerequisites

- Completed [SAST/DAST Patterns with Copilot](/Learn-GHCP/courses/persona/security-intermediate/)
- Experience with GitHub Actions and CI/CD pipelines
- Familiarity with Node.js and TypeScript
- Understanding of MCP (Model Context Protocol) concepts

## Architecture Overview

The security audit agent pipeline consists of four autonomous agents that work together:

```
┌─────────────────────────────────────────────────┐
│              Security Audit Pipeline             │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Discovery │→ │ Analysis │→ │ Remediation  │  │
│  │  Agent    │  │  Agent   │  │   Agent      │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│       ↑                            │             │
│       │        ┌──────────┐        │             │
│       └────────│ Reporting│←───────┘             │
│                │  Agent   │                      │
│                └──────────┘                      │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │     MCP Server (Vulnerability DB)       │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

Each agent has a specific role:
- **Discovery Agent** — scans the codebase, dependencies, and infrastructure configs
- **Analysis Agent** — triages findings, assesses severity, and eliminates false positives
- **Remediation Agent** — generates patches and creates pull requests for confirmed issues
- **Reporting Agent** — aggregates results and produces compliance reports

## Step 1: Build the MCP Server for Vulnerability Data

Create an MCP server that exposes vulnerability databases (NVD, GitHub Advisory) to Copilot agents:

```typescript
// mcp-security-server/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

interface VulnEntry {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  package: string;
  description: string;
  fixVersion?: string;
  cwe: string[];
  cvss: number;
}

const server = new McpServer({
  name: 'security-audit-server',
  version: '1.0.0',
});

// Tool: Look up vulnerabilities for a specific package
server.tool(
  'lookup_vulnerabilities',
  'Query the vulnerability database for a specific package and version',
  {
    package_name: z.string().describe('Package name (e.g., lodash)'),
    version: z.string().describe('Current version (e.g., 4.17.20)'),
    ecosystem: z.enum(['npm', 'pip', 'maven', 'nuget']).describe('Package ecosystem'),
  },
  async ({ package_name, version, ecosystem }) => {
    const response = await fetch(
      `https://api.github.com/advisories?affects=${ecosystem}:${package_name}@${version}`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    const advisories = await response.json();

    const vulns: VulnEntry[] = advisories.map((adv: any) => ({
      id: adv.ghsa_id,
      severity: adv.severity,
      package: package_name,
      description: adv.summary,
      fixVersion: adv.vulnerabilities?.[0]?.patched_versions,
      cwe: adv.cwes?.map((c: any) => c.cwe_id) ?? [],
      cvss: adv.cvss?.score ?? 0,
    }));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(vulns, null, 2),
        },
      ],
    };
  }
);

// Tool: Get the OWASP classification for a CWE
server.tool(
  'classify_cwe',
  'Map a CWE identifier to its OWASP Top 10 category',
  {
    cwe_id: z.string().describe('CWE identifier (e.g., CWE-79)'),
  },
  async ({ cwe_id }) => {
    const owaspMapping: Record<string, string> = {
      'CWE-79': 'A03:2021 — Injection (XSS)',
      'CWE-89': 'A03:2021 — Injection (SQLi)',
      'CWE-287': 'A07:2021 — Identification and Authentication Failures',
      'CWE-502': 'A08:2021 — Software and Data Integrity Failures',
      'CWE-918': 'A10:2021 — Server-Side Request Forgery',
      'CWE-22': 'A01:2021 — Broken Access Control',
      'CWE-352': 'A01:2021 — Broken Access Control (CSRF)',
      'CWE-327': 'A02:2021 — Cryptographic Failures',
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: owaspMapping[cwe_id] ?? `No OWASP mapping found for ${cwe_id}`,
        },
      ],
    };
  }
);

// Tool: Generate a remediation plan
server.tool(
  'generate_remediation',
  'Create a remediation plan for a list of vulnerabilities',
  {
    vulnerabilities: z.array(z.object({
      id: z.string(),
      severity: z.string(),
      package: z.string(),
      fixVersion: z.string().optional(),
    })).describe('List of vulnerabilities to remediate'),
  },
  async ({ vulnerabilities }) => {
    const plan = vulnerabilities.map((vuln) => ({
      id: vuln.id,
      action: vuln.fixVersion
        ? `Upgrade ${vuln.package} to ${vuln.fixVersion}`
        : `Investigate ${vuln.package} — no patched version available`,
      priority: vuln.severity === 'critical' ? 'P0' : vuln.severity === 'high' ? 'P1' : 'P2',
      automated: !!vuln.fixVersion,
    }));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(plan, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Security Audit MCP Server running on stdio');
}

main().catch(console.error);
```

**Register the MCP server with Copilot CLI:**

```json
// .vscode/mcp.json
{
  "servers": {
    "security-audit": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "mcp-security-server/src/index.ts"]
    }
  }
}
```

## Step 2: Discovery Agent — Automated Vulnerability Scanning

Create an agent that scans the repository and feeds findings into the pipeline:

```typescript
// agents/discovery-agent.ts
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

interface Finding {
  id: string;
  source: 'sast' | 'dependency' | 'secret' | 'config';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  file?: string;
  line?: number;
  description: string;
  rawData?: unknown;
}

export async function runDiscovery(repoPath: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // 1. Run CodeQL SAST scan
  console.log('🔍 Running SAST scan...');
  try {
    execSync(
      `codeql database create /tmp/codeql-db --language=javascript --source-root=${repoPath}`,
      { stdio: 'pipe' }
    );
    const sarif = execSync(
      `codeql database analyze /tmp/codeql-db --format=sarif-latest --output=/dev/stdout javascript-security-extended`,
      { encoding: 'utf-8' }
    );
    const results = JSON.parse(sarif);

    for (const run of results.runs ?? []) {
      for (const result of run.results ?? []) {
        findings.push({
          id: `SAST-${findings.length + 1}`,
          source: 'sast',
          severity: mapSarifSeverity(result.level),
          title: result.message.text,
          file: result.locations?.[0]?.physicalLocation?.artifactLocation?.uri,
          line: result.locations?.[0]?.physicalLocation?.region?.startLine,
          description: result.ruleId ?? 'Unknown rule',
        });
      }
    }
  } catch (err) {
    console.warn('CodeQL scan failed, continuing with other checks...');
  }

  // 2. Run dependency audit
  console.log('📦 Scanning dependencies...');
  try {
    const auditOutput = execSync('npm audit --json 2>/dev/null', {
      encoding: 'utf-8',
      cwd: repoPath,
    });
    const audit = JSON.parse(auditOutput);

    for (const [name, advisory] of Object.entries(audit.advisories ?? {})) {
      const adv = advisory as any;
      findings.push({
        id: `DEP-${adv.id}`,
        source: 'dependency',
        severity: adv.severity,
        title: `${adv.module_name}@${adv.findings?.[0]?.version}: ${adv.title}`,
        description: adv.overview ?? '',
        rawData: adv,
      });
    }
  } catch {
    console.warn('npm audit not available or failed');
  }

  // 3. Scan for hardcoded secrets
  console.log('🔑 Scanning for secrets...');
  const secretPatterns = [
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
    { name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9]{20,}['"]/gi },
    { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
    { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g },
  ];

  const files = execSync(`find ${repoPath} -type f -name '*.ts' -o -name '*.js' -o -name '*.env'`, {
    encoding: 'utf-8',
  }).trim().split('\n').filter(Boolean);

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      for (const { name, pattern } of secretPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `SECRET-${findings.length + 1}`,
            source: 'secret',
            severity: 'critical',
            title: `${name} detected in ${file}`,
            file,
            description: `Found ${matches.length} potential ${name} pattern(s)`,
          });
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  // 4. Check for insecure configurations
  console.log('⚙️ Checking configurations...');
  const dockerfiles = execSync(`find ${repoPath} -name 'Dockerfile*' 2>/dev/null`, {
    encoding: 'utf-8',
  }).trim().split('\n').filter(Boolean);

  for (const dockerfile of dockerfiles) {
    const content = readFileSync(dockerfile, 'utf-8');
    if (/USER root/i.test(content) || !/USER /i.test(content)) {
      findings.push({
        id: `CONFIG-${findings.length + 1}`,
        source: 'config',
        severity: 'high',
        title: `Container runs as root: ${dockerfile}`,
        file: dockerfile,
        description: 'Containers should run as a non-root user for security',
      });
    }
  }

  writeFileSync('security-findings.json', JSON.stringify(findings, null, 2));
  console.log(`\n✅ Discovery complete: ${findings.length} findings`);
  return findings;
}

function mapSarifSeverity(level?: string): Finding['severity'] {
  switch (level) {
    case 'error': return 'critical';
    case 'warning': return 'high';
    case 'note': return 'medium';
    default: return 'low';
  }
}
```

## Step 3: Analysis Agent — Triage and Prioritization

The analysis agent evaluates findings, eliminates false positives, and prioritizes issues:

```typescript
// agents/analysis-agent.ts
import { readFileSync } from 'fs';

interface Finding {
  id: string;
  source: string;
  severity: string;
  title: string;
  file?: string;
  line?: number;
  description: string;
}

interface TriagedFinding extends Finding {
  confidence: 'confirmed' | 'likely' | 'possible' | 'false-positive';
  exploitability: 'easy' | 'moderate' | 'difficult';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  recommendation: string;
}

const FALSE_POSITIVE_PATTERNS = [
  /test[/\\]/i,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /fixtures?[/\\]/i,
  /mock[/\\]/i,
  /__tests__/i,
];

export function analyzeFindings(findings: Finding[]): TriagedFinding[] {
  return findings
    .map((finding) => triage(finding))
    .filter((f) => f.confidence !== 'false-positive')
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
}

function triage(finding: Finding): TriagedFinding {
  // Filter out test files
  if (finding.file && FALSE_POSITIVE_PATTERNS.some((p) => p.test(finding.file!))) {
    return {
      ...finding,
      confidence: 'false-positive',
      exploitability: 'difficult',
      priority: 'P3',
      recommendation: 'Finding is in test code — no action needed',
    };
  }

  // Check if file is reachable from a public endpoint
  const isPublicFacing = finding.file ? checkPublicExposure(finding.file) : false;

  const exploitability = isPublicFacing ? 'easy' : 'moderate';
  const confidence = finding.source === 'secret' ? 'confirmed' : 'likely';

  const priority = determinePriority(finding.severity, exploitability, confidence);

  return {
    ...finding,
    confidence,
    exploitability,
    priority,
    recommendation: generateRecommendation(finding, priority),
  };
}

function checkPublicExposure(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return /app\.(get|post|put|delete|patch)\s*\(/i.test(content)
        || /router\.(get|post|put|delete)\s*\(/i.test(content)
        || /@(Get|Post|Put|Delete|Patch)Mapping/i.test(content);
  } catch {
    return false;
  }
}

function determinePriority(
  severity: string,
  exploitability: string,
  confidence: string
): TriagedFinding['priority'] {
  if (severity === 'critical' && exploitability === 'easy') return 'P0';
  if (severity === 'critical' || (severity === 'high' && exploitability === 'easy')) return 'P1';
  if (severity === 'high' || severity === 'medium') return 'P2';
  return 'P3';
}

function generateRecommendation(finding: Finding, priority: string): string {
  const actions: Record<string, string> = {
    sast: 'Apply the suggested code fix and add a regression test',
    dependency: 'Upgrade to the patched version or find an alternative package',
    secret: 'Rotate the exposed credential immediately and remove from source',
    config: 'Update the configuration to follow security best practices',
  };
  return actions[finding.source] ?? 'Review and address the finding';
}

function priorityWeight(priority: string): number {
  const weights: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return weights[priority] ?? 99;
}
```

## Step 4: Remediation Agent — Automated Patch Generation

The remediation agent generates fixes and creates pull requests:

```typescript
// agents/remediation-agent.ts
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

interface TriagedFinding {
  id: string;
  source: string;
  severity: string;
  title: string;
  file?: string;
  line?: number;
  priority: string;
  recommendation: string;
}

interface Patch {
  findingId: string;
  file: string;
  originalContent: string;
  patchedContent: string;
  description: string;
}

export async function generatePatches(findings: TriagedFinding[]): Promise<Patch[]> {
  const patches: Patch[] = [];

  for (const finding of findings) {
    if (!finding.file) continue;

    const patch = await generatePatchForFinding(finding);
    if (patch) patches.push(patch);
  }

  return patches;
}

async function generatePatchForFinding(finding: TriagedFinding): Promise<Patch | null> {
  if (!finding.file) return null;

  try {
    const original = readFileSync(finding.file, 'utf-8');
    let patched = original;

    // Apply pattern-based fixes
    if (finding.source === 'dependency') {
      return handleDependencyFix(finding);
    }

    if (finding.title.includes('SQL injection') || finding.title.includes('SQLi')) {
      patched = fixSqlInjection(original);
    } else if (finding.title.includes('XSS') || finding.title.includes('Cross-Site')) {
      patched = fixXss(original);
    } else if (finding.source === 'secret') {
      patched = fixHardcodedSecret(original);
    } else if (finding.title.includes('root')) {
      patched = fixDockerRoot(original);
    }

    if (patched === original) return null;

    return {
      findingId: finding.id,
      file: finding.file,
      originalContent: original,
      patchedContent: patched,
      description: finding.recommendation,
    };
  } catch {
    return null;
  }
}

function fixSqlInjection(content: string): string {
  // Replace string interpolation in SQL with parameterized queries
  return content.replace(
    /`SELECT \* FROM (\w+) WHERE (\w+) = '\$\{(\w+)\}'`/g,
    "'SELECT * FROM $1 WHERE $2 = ?', [$3]"
  );
}

function fixXss(content: string): string {
  // Add HTML escaping for user input in template strings
  if (!content.includes("import { escape }") && !content.includes("import escape")) {
    content = "import { escape } from 'html-escaper';\n" + content;
  }
  return content.replace(
    /`<(\w+)>\$\{(\w+)\}<\/\1>`/g,
    '`<$1>${escape($2)}</$1>`'
  );
}

function fixHardcodedSecret(content: string): string {
  return content.replace(
    /(?:const|let|var)\s+(\w+)\s*=\s*['"][A-Za-z0-9_\-]{16,}['"]/g,
    (_, varName) => `const ${varName} = process.env.${varName.toUpperCase()}`
  );
}

function fixDockerRoot(content: string): string {
  if (!/USER /i.test(content)) {
    const lines = content.split('\n');
    const cmdIndex = lines.findIndex((l) => /^(CMD|ENTRYPOINT)/i.test(l.trim()));
    if (cmdIndex > 0) {
      lines.splice(cmdIndex, 0, 'USER node');
      return lines.join('\n');
    }
  }
  return content;
}

function handleDependencyFix(finding: TriagedFinding): Patch | null {
  try {
    execSync('npm audit fix --force', { encoding: 'utf-8' });
    return {
      findingId: finding.id,
      file: 'package.json',
      originalContent: '',
      patchedContent: '',
      description: 'Applied npm audit fix for vulnerable dependencies',
    };
  } catch {
    return null;
  }
}

// Create PRs for patches
export async function createRemediationPRs(patches: Patch[]): Promise<void> {
  if (patches.length === 0) {
    console.log('No patches to apply');
    return;
  }

  const branch = `security/auto-remediation-${Date.now()}`;
  execSync(`git checkout -b ${branch}`);

  for (const patch of patches) {
    if (patch.patchedContent) {
      writeFileSync(patch.file, patch.patchedContent);
    }
  }

  execSync('git add -A');
  execSync(`git commit -m "fix(security): auto-remediate ${patches.length} vulnerability findings"`);
  execSync(`git push origin ${branch}`);

  console.log(`\n🔧 Created remediation branch: ${branch}`);
  console.log(`   ${patches.length} patches applied`);
}
```

## Step 5: Reporting Agent — Compliance Documentation

Generate audit reports that satisfy compliance requirements:

```typescript
// agents/reporting-agent.ts
import { writeFileSync } from 'fs';

interface AuditReport {
  timestamp: string;
  summary: { total: number; critical: number; high: number; remediated: number };
  findings: any[];
  compliance: ComplianceStatus[];
}

interface ComplianceStatus {
  framework: string;
  control: string;
  status: 'compliant' | 'non-compliant' | 'partial';
  evidence: string;
}

export function generateReport(
  findings: any[],
  patches: any[],
): AuditReport {
  const remediatedIds = new Set(patches.map((p: any) => p.findingId));

  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: findings.length,
      critical: findings.filter((f: any) => f.severity === 'critical').length,
      high: findings.filter((f: any) => f.severity === 'high').length,
      remediated: patches.length,
    },
    findings: findings.map((f: any) => ({
      ...f,
      remediationStatus: remediatedIds.has(f.id) ? 'fixed' : 'open',
    })),
    compliance: evaluateCompliance(findings, patches),
  };

  // Write Markdown report
  const md = formatMarkdownReport(report);
  writeFileSync('SECURITY-AUDIT-REPORT.md', md);

  // Write JSON for machine consumption
  writeFileSync('security-audit-report.json', JSON.stringify(report, null, 2));

  console.log(`\n📊 Audit report generated:`);
  console.log(`   Total findings: ${report.summary.total}`);
  console.log(`   Critical: ${report.summary.critical}`);
  console.log(`   Auto-remediated: ${report.summary.remediated}`);

  return report;
}

function evaluateCompliance(findings: any[], patches: any[]): ComplianceStatus[] {
  const openCritical = findings.filter(
    (f: any) => f.severity === 'critical' && !patches.some((p: any) => p.findingId === f.id)
  );

  return [
    {
      framework: 'SOC 2 Type II',
      control: 'CC6.1 — Logical Access',
      status: openCritical.some((f: any) => f.source === 'sast') ? 'non-compliant' : 'compliant',
      evidence: 'Automated SAST scan with CodeQL',
    },
    {
      framework: 'SOC 2 Type II',
      control: 'CC6.7 — Data Encryption',
      status: openCritical.some((f: any) => f.title.includes('crypto')) ? 'non-compliant' : 'compliant',
      evidence: 'Cryptographic configuration review',
    },
    {
      framework: 'OWASP ASVS',
      control: 'V5 — Validation',
      status: openCritical.some((f: any) => f.title.includes('injection')) ? 'non-compliant' : 'compliant',
      evidence: 'Input validation scanning via CodeQL',
    },
    {
      framework: 'PCI DSS',
      control: 'Req 6.5 — Secure Development',
      status: findings.length === patches.length ? 'compliant' : 'partial',
      evidence: `${patches.length}/${findings.length} vulnerabilities auto-remediated`,
    },
  ];
}

function formatMarkdownReport(report: AuditReport): string {
  return `# 🔒 Security Audit Report

**Generated:** ${report.timestamp}

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Findings | ${report.summary.total} |
| Critical | ${report.summary.critical} |
| High | ${report.summary.high} |
| Auto-Remediated | ${report.summary.remediated} |

## Compliance Status

| Framework | Control | Status | Evidence |
|-----------|---------|--------|----------|
${report.compliance.map((c) => `| ${c.framework} | ${c.control} | ${c.status === 'compliant' ? '✅' : c.status === 'partial' ? '⚠️' : '❌'} ${c.status} | ${c.evidence} |`).join('\n')}

## Detailed Findings

${report.findings.map((f: any) => `### ${f.id}: ${f.title}
- **Severity:** ${f.severity}
- **Source:** ${f.source}
- **File:** ${f.file ?? 'N/A'}
- **Status:** ${f.remediationStatus === 'fixed' ? '✅ Remediated' : '🔴 Open'}
- **Recommendation:** ${f.recommendation ?? 'Review and address'}
`).join('\n')}
`;
}
```

## Step 6: Orchestrate the Full Pipeline

Tie all agents together in a GitHub Actions workflow:

```yaml
# .github/workflows/security-audit-pipeline.yml
name: Security Audit Agent Pipeline

on:
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM
  workflow_dispatch:
    inputs:
      scan_scope:
        description: 'Scan scope'
        type: choice
        options: [full, changed-files, dependencies-only]
        default: full

permissions:
  contents: write
  pull-requests: write
  security-events: write
  issues: write

jobs:
  discover:
    name: "🔍 Discovery Agent"
    runs-on: ubuntu-latest
    outputs:
      finding_count: ${{ steps.scan.outputs.count }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Run discovery
        id: scan
        run: |
          npx tsx agents/discovery-agent.ts .
          COUNT=$(jq length security-findings.json)
          echo "count=$COUNT" >> $GITHUB_OUTPUT
      - uses: actions/upload-artifact@v4
        with:
          name: findings
          path: security-findings.json

  analyze:
    name: "🧠 Analysis Agent"
    needs: discover
    if: needs.discover.outputs.finding_count > 0
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: findings
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Triage findings
        run: npx tsx agents/analysis-agent.ts
      - uses: actions/upload-artifact@v4
        with:
          name: triaged-findings
          path: triaged-findings.json

  remediate:
    name: "🔧 Remediation Agent"
    needs: analyze
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: triaged-findings
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Generate and apply patches
        run: npx tsx agents/remediation-agent.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/upload-artifact@v4
        with:
          name: patches
          path: patches.json

  report:
    name: "📊 Reporting Agent"
    needs: [discover, analyze, remediate]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          path: artifacts
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Generate audit report
        run: npx tsx agents/reporting-agent.ts
      - name: Create issue with report
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('SECURITY-AUDIT-REPORT.md', 'utf-8');
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🔒 Security Audit — ${new Date().toISOString().split('T')[0]}`,
              body: report,
              labels: ['security', 'automated-audit'],
            });
```

## 🎯 Capstone: Build Your Security Audit Agent Pipeline

Using everything you've learned, build a complete security audit pipeline for your project:

1. **Set up the MCP server** with your organization's vulnerability data sources
2. **Configure the discovery agent** to scan your specific tech stack
3. **Customize the analysis agent** with your organization's risk tolerance and false-positive rules
4. **Wire up the remediation agent** to create PRs with your team's review workflow
5. **Generate compliance reports** aligned with your regulatory requirements

**Success criteria:**
- Pipeline runs nightly and produces an audit report
- Critical findings trigger immediate Slack/email notifications
- Remediation PRs are created automatically for P0 and P1 issues
- Compliance reports are archived for audit purposes

## 🎯 What You Learned

- How to architect an autonomous security audit system with multiple agents
- Building an MCP server that exposes vulnerability databases to Copilot
- Automated vulnerability discovery across SAST, dependencies, secrets, and config
- Intelligent triage with false-positive elimination and risk prioritization
- Automated patch generation and PR creation for security fixes
- Compliance reporting for SOC 2, OWASP ASVS, and PCI DSS

## 📚 Glossary

- **MCP (Model Context Protocol)**: A protocol for connecting AI assistants to external tools and data
- **SARIF**: Static Analysis Results Interchange Format — standard for SAST tool output
- **NVD**: National Vulnerability Database — a US government source of vulnerability data
- **CWE**: Common Weakness Enumeration — a categorization of software weaknesses
- **CVSS**: Common Vulnerability Scoring System — severity rating from 0.0 to 10.0

## ➡️ Next Steps

You've built a complete security audit pipeline! Consider exploring:
- 🏗️ [Platform Engineering with Agentic Copilot](/Learn-GHCP/courses/persona/architect-advanced/) for integrating security into a developer platform
