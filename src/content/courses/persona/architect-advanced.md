---
title: "Platform Engineering with Agentic Copilot"
description: "Build an internal developer platform using Copilot agents, MCP servers, and automated governance workflows."
track: "persona"
difficulty: "advanced"
featureRefs:
  - copilot-agents
  - mcp-integration
  - copilot-cli
  - cli-plugins
personaTags:
  - architect
technologyTags:
  - architecture
  - platform-engineering
  - mcp
  - kubernetes
prerequisites:
  - architect-intermediate
estimatedMinutes: 90
lastGenerated: 2026-04-08
published: true
---

# 🔴 Platform Engineering with Agentic Copilot

In this advanced course you'll design and build an Internal Developer Platform (IDP) powered by Copilot agents, MCP servers, and automated governance. By the end you'll have a working platform that guides developers through golden paths while enforcing architectural standards.

## Prerequisites

- Completed [System Design with Copilot Agent Mode](/Learn-GHCP/courses/persona/architect-intermediate/)
- Experience with Kubernetes and container orchestration
- Familiarity with MCP (Model Context Protocol) concepts
- Understanding of platform engineering principles

## Architecture: The Agentic IDP

An Internal Developer Platform removes cognitive load from application teams. With Copilot agents, you can make it conversational:

```
┌─────────────────────────────────────────────────────────┐
│                Internal Developer Platform                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Copilot CLI / Chat Interface            │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                    │
│  ┌──────────┐  ┌────┴─────┐  ┌────────────┐            │
│  │ Template  │  │ Platform │  │ Governance │            │
│  │  Agent    │  │  Agent   │  │   Agent    │            │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘            │
│       │              │              │                    │
│  ┌────┴──────────────┴──────────────┴──────┐            │
│  │         MCP Server Layer                 │            │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ │            │
│  │  │Template │ │Kubernetes│ │ Policy   │ │            │
│  │  │Registry │ │  API     │ │ Engine   │ │            │
│  │  └─────────┘ └──────────┘ └──────────┘ │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │
│  │ GitHub     │  │ Kubernetes │  │ Observability  │    │
│  │ Repos      │  │ Clusters   │  │ Stack          │    │
│  └────────────┘  └────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

Developers interact with the platform through Copilot:

```
Developer: "Create a new Python microservice called inventory-service"
Platform Agent: Creates repo from golden path template, sets up CI/CD,
               provisions staging environment, configures monitoring
```

## Step 1: Build the Platform MCP Server

The MCP server is the backbone—it exposes platform capabilities to Copilot agents:

```typescript
// mcp-platform-server/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { KubeConfig, AppsV1Api, CoreV1Api } from '@kubernetes/client-node';

const server = new McpServer({
  name: 'platform-engineering-server',
  version: '1.0.0',
});

// Tool: Scaffold a new service from golden path template
server.tool(
  'scaffold_service',
  'Create a new microservice from a golden path template',
  {
    name: z.string().describe('Service name (kebab-case)'),
    language: z.enum(['typescript', 'python', 'go', 'java']).describe('Primary language'),
    template: z.enum([
      'rest-api',
      'graphql-api',
      'event-consumer',
      'scheduled-job',
    ]).describe('Golden path template'),
    team: z.string().describe('Owning team name'),
    tier: z.enum(['critical', 'standard', 'experimental']).describe('Service tier'),
  },
  async ({ name, language, template, team, tier }) => {
    const config = generateServiceConfig(name, language, template, team, tier);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          status: 'scaffolded',
          repository: `https://github.com/org/${name}`,
          files: config.files,
          pipelines: config.pipelines,
          infrastructure: config.infrastructure,
          nextSteps: [
            `Clone: git clone https://github.com/org/${name}`,
            'Run: npm install && npm run dev',
            `Dashboard: https://platform.internal/services/${name}`,
          ],
        }, null, 2),
      }],
    };
  }
);

// Tool: Deploy a service to a target environment
server.tool(
  'deploy_service',
  'Deploy a service to a Kubernetes environment',
  {
    service: z.string().describe('Service name'),
    environment: z.enum(['dev', 'staging', 'production']).describe('Target environment'),
    version: z.string().describe('Version tag to deploy'),
    strategy: z.enum(['rolling', 'blue-green', 'canary']).default('rolling'),
  },
  async ({ service, environment, version, strategy }) => {
    const kc = new KubeConfig();
    kc.loadFromDefault();
    const appsApi = kc.makeApiClient(AppsV1Api);

    const namespace = `${service}-${environment}`;

    try {
      await appsApi.patchNamespacedDeployment(
        { name: service, namespace },
        {
          spec: {
            template: {
              spec: {
                containers: [{
                  name: service,
                  image: `registry.internal/${service}:${version}`,
                }],
              },
            },
          },
        }
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            status: 'deploying',
            service,
            environment,
            version,
            strategy,
            monitorUrl: `https://grafana.internal/d/${service}?env=${environment}`,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Deployment failed: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  }
);

// Tool: Check service health across environments
server.tool(
  'check_service_health',
  'Get health status of a service across all environments',
  {
    service: z.string().describe('Service name'),
  },
  async ({ service }) => {
    const kc = new KubeConfig();
    kc.loadFromDefault();
    const coreApi = kc.makeApiClient(CoreV1Api);

    const environments = ['dev', 'staging', 'production'];
    const healthData = [];

    for (const env of environments) {
      try {
        const pods = await coreApi.listNamespacedPod({ namespace: `${service}-${env}` });
        const running = pods.items.filter(
          (p) => p.status?.phase === 'Running'
        ).length;
        const total = pods.items.length;

        healthData.push({
          environment: env,
          status: running === total ? 'healthy' : 'degraded',
          pods: `${running}/${total}`,
          version: pods.items[0]?.spec?.containers[0]?.image?.split(':')[1] ?? 'unknown',
        });
      } catch {
        healthData.push({
          environment: env,
          status: 'not-deployed',
          pods: '0/0',
          version: 'N/A',
        });
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(healthData, null, 2),
      }],
    };
  }
);

// Tool: List available golden path templates
server.tool(
  'list_templates',
  'List all available golden path templates with their features',
  {},
  async () => {
    const templates = [
      {
        id: 'rest-api',
        languages: ['typescript', 'python', 'go', 'java'],
        includes: ['OpenAPI spec', 'Dockerfile', 'CI/CD', 'Helm chart', 'Monitoring dashboards'],
        description: 'RESTful API service with full observability stack',
      },
      {
        id: 'graphql-api',
        languages: ['typescript', 'python'],
        includes: ['GraphQL schema', 'Dockerfile', 'CI/CD', 'Helm chart', 'Apollo tracing'],
        description: 'GraphQL API with federation support',
      },
      {
        id: 'event-consumer',
        languages: ['typescript', 'python', 'go'],
        includes: ['Consumer config', 'Dockerfile', 'CI/CD', 'Helm chart', 'DLQ setup'],
        description: 'Event-driven consumer for Kafka or RabbitMQ topics',
      },
      {
        id: 'scheduled-job',
        languages: ['typescript', 'python'],
        includes: ['CronJob spec', 'Dockerfile', 'CI/CD', 'Alerting'],
        description: 'Scheduled batch job with monitoring',
      },
    ];

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(templates, null, 2),
      }],
    };
  }
);

function generateServiceConfig(
  name: string,
  language: string,
  template: string,
  team: string,
  tier: string,
) {
  return {
    files: [
      `src/index.${language === 'typescript' ? 'ts' : language === 'python' ? 'py' : 'go'}`,
      'Dockerfile',
      'helm/Chart.yaml',
      'helm/values.yaml',
      `.github/workflows/ci.yml`,
      `.github/workflows/deploy.yml`,
      'catalog-info.yaml',
    ],
    pipelines: {
      ci: `Build → Test → Lint → Security Scan → Docker Build`,
      deploy: `Dev (auto) → Staging (auto) → Production (manual approval)`,
    },
    infrastructure: {
      namespace: `${name}-dev`,
      database: tier === 'experimental' ? 'none' : 'postgresql',
      cache: tier === 'critical' ? 'redis-cluster' : 'none',
      monitoring: {
        dashboard: `https://grafana.internal/d/${name}`,
        alerts: tier === 'critical' ? 'pagerduty' : 'slack',
      },
    },
  };
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Platform Engineering MCP Server running on stdio');
}

main().catch(console.error);
```

**Register with Copilot CLI:**

```json
// .vscode/mcp.json
{
  "servers": {
    "platform-engineering": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "mcp-platform-server/src/index.ts"]
    }
  }
}
```

## Step 2: Golden Path Templates with Agents

Create a template agent that generates complete, production-ready service scaffolds:

```typescript
// agents/template-agent.ts
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TemplateConfig {
  name: string;
  language: 'typescript' | 'python' | 'go';
  template: 'rest-api' | 'graphql-api' | 'event-consumer';
  team: string;
  tier: 'critical' | 'standard' | 'experimental';
}

export function generateGoldenPath(config: TemplateConfig): void {
  const root = config.name;

  // Create directory structure
  const dirs = [
    '', 'src', 'src/api', 'src/domain', 'src/infrastructure',
    'tests', 'tests/unit', 'tests/integration',
    'helm', 'helm/templates',
    '.github', '.github/workflows',
  ];
  dirs.forEach((d) => mkdirSync(join(root, d), { recursive: true }));

  // Generate Backstage catalog entry
  writeFileSync(join(root, 'catalog-info.yaml'), `
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${config.name}
  description: "${config.name} service"
  annotations:
    github.com/project-slug: "org/${config.name}"
    backstage.io/techdocs-ref: dir:.
  tags:
    - ${config.language}
    - ${config.template}
spec:
  type: service
  lifecycle: production
  owner: group:${config.team}
  system: platform
  providesApis:
    - ${config.name}-api
`.trim());

  // Generate Helm chart
  writeFileSync(join(root, 'helm', 'Chart.yaml'), `
apiVersion: v2
name: ${config.name}
version: 0.1.0
appVersion: "1.0.0"
description: Helm chart for ${config.name}
`.trim());

  writeFileSync(join(root, 'helm', 'values.yaml'), `
replicaCount: ${config.tier === 'critical' ? 3 : 2}

image:
  repository: registry.internal/${config.name}
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3000

resources:
  requests:
    cpu: ${config.tier === 'critical' ? '500m' : '250m'}
    memory: ${config.tier === 'critical' ? '512Mi' : '256Mi'}
  limits:
    cpu: ${config.tier === 'critical' ? '1000m' : '500m'}
    memory: ${config.tier === 'critical' ? '1Gi' : '512Mi'}

autoscaling:
  enabled: ${config.tier === 'critical'}
  minReplicas: ${config.tier === 'critical' ? 3 : 2}
  maxReplicas: ${config.tier === 'critical' ? 20 : 5}
  targetCPUUtilizationPercentage: 70

monitoring:
  enabled: true
  dashboardId: ${config.name}
  alerts:
    channel: ${config.tier === 'critical' ? 'pagerduty' : 'slack'}
`.trim());

  // Generate Helm deployment template
  writeFileSync(join(root, 'helm', 'templates', 'deployment.yaml'), `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
  labels:
    app: {{ .Release.Name }}
    tier: ${config.tier}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: {{ .Release.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: {{ .Values.service.port }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: /health/live
              port: {{ .Values.service.port }}
            initialDelaySeconds: 15
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: {{ .Values.service.port }}
            initialDelaySeconds: 5
            periodSeconds: 5
`.trim());

  // Generate CI/CD workflow
  writeFileSync(join(root, '.github', 'workflows', 'ci.yml'), `
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript
      - uses: github/codeql-action/analyze@v3

  docker:
    needs: [build-test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: registry.internal/${config.name}:\${{ github.sha }}
`.trim());

  console.log(`✅ Golden path template generated for ${config.name}`);
}
```

## Step 3: Automated Architecture Governance

Build a governance agent that enforces architectural standards:

```typescript
// agents/governance-agent.ts
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface GovernanceRule {
  id: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  check: (repoPath: string) => GovernanceResult;
}

interface GovernanceResult {
  passed: boolean;
  message: string;
  remediation?: string;
}

const rules: GovernanceRule[] = [
  {
    id: 'GOV-001',
    name: 'Dockerfile must use approved base images',
    severity: 'error',
    check: (repoPath) => {
      const dockerfile = join(repoPath, 'Dockerfile');
      if (!existsSync(dockerfile)) {
        return { passed: false, message: 'No Dockerfile found' };
      }
      const content = readFileSync(dockerfile, 'utf-8');
      const approvedBases = [
        'registry.internal/node:',
        'registry.internal/python:',
        'registry.internal/golang:',
      ];
      const fromLines = content.match(/^FROM\s+(.+)$/gm) ?? [];
      const allApproved = fromLines.every((line) =>
        approvedBases.some((base) => line.includes(base))
      );

      return {
        passed: allApproved,
        message: allApproved
          ? 'All base images are from the approved registry'
          : `Unapproved base image detected: ${fromLines.join(', ')}`,
        remediation: 'Use images from registry.internal/ only',
      };
    },
  },
  {
    id: 'GOV-002',
    name: 'Service must have health check endpoints',
    severity: 'error',
    check: (repoPath) => {
      const srcDir = join(repoPath, 'src');
      if (!existsSync(srcDir)) {
        return { passed: false, message: 'No src directory found' };
      }

      const files = getAllFiles(srcDir);
      const hasHealthCheck = files.some((f) => {
        const content = readFileSync(f, 'utf-8');
        return /\/health|healthz|health\/ready|health\/live/i.test(content);
      });

      return {
        passed: hasHealthCheck,
        message: hasHealthCheck
          ? 'Health check endpoints found'
          : 'No health check endpoints detected',
        remediation: 'Add /health/live and /health/ready endpoints',
      };
    },
  },
  {
    id: 'GOV-003',
    name: 'Service must have a catalog-info.yaml',
    severity: 'error',
    check: (repoPath) => {
      const exists = existsSync(join(repoPath, 'catalog-info.yaml'));
      return {
        passed: exists,
        message: exists
          ? 'catalog-info.yaml found'
          : 'Missing catalog-info.yaml for service catalog registration',
        remediation: 'Add a catalog-info.yaml following the Backstage Component spec',
      };
    },
  },
  {
    id: 'GOV-004',
    name: 'Helm chart must define resource limits',
    severity: 'error',
    check: (repoPath) => {
      const valuesPath = join(repoPath, 'helm', 'values.yaml');
      if (!existsSync(valuesPath)) {
        return { passed: false, message: 'No Helm values.yaml found' };
      }
      const content = readFileSync(valuesPath, 'utf-8');
      const hasLimits = /resources:[\s\S]*limits:/m.test(content);

      return {
        passed: hasLimits,
        message: hasLimits
          ? 'Resource limits defined in Helm values'
          : 'No resource limits found in Helm values',
        remediation: 'Define CPU and memory limits in helm/values.yaml',
      };
    },
  },
  {
    id: 'GOV-005',
    name: 'Service must expose Prometheus metrics',
    severity: 'warning',
    check: (repoPath) => {
      const srcDir = join(repoPath, 'src');
      if (!existsSync(srcDir)) {
        return { passed: false, message: 'No src directory found' };
      }

      const files = getAllFiles(srcDir);
      const hasMetrics = files.some((f) => {
        const content = readFileSync(f, 'utf-8');
        return /prom-client|prometheus|\/metrics/i.test(content);
      });

      return {
        passed: hasMetrics,
        message: hasMetrics
          ? 'Prometheus metrics integration found'
          : 'No Prometheus metrics detected',
        remediation: 'Add prom-client and expose a /metrics endpoint',
      };
    },
  },
];

function getAllFiles(dir: string): string[] {
  const { readdirSync, statSync } = require('fs');
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...getAllFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

export function runGovernanceCheck(repoPath: string): void {
  console.log('🏛️ Running architecture governance checks...\n');

  const results = rules.map((rule) => ({
    ...rule,
    result: rule.check(repoPath),
  }));

  for (const { id, name, severity, result } of results) {
    const icon = result.passed ? '✅' : severity === 'error' ? '❌' : '⚠️';
    console.log(`${icon} [${id}] ${name}`);
    console.log(`   ${result.message}`);
    if (!result.passed && result.remediation) {
      console.log(`   💡 ${result.remediation}`);
    }
    console.log();
  }

  const errors = results.filter((r) => !r.result.passed && r.severity === 'error');
  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} governance violations found`);
    process.exit(1);
  } else {
    console.log('\n✅ All governance checks passed');
  }
}
```

## Step 4: Cost Optimization Agent

Build an agent that analyzes cluster resource usage and recommends optimizations:

```typescript
// agents/cost-optimization-agent.ts
import { KubeConfig, CoreV1Api, AppsV1Api } from '@kubernetes/client-node';

interface CostRecommendation {
  service: string;
  namespace: string;
  currentCost: string;
  recommendation: string;
  estimatedSavings: string;
  risk: 'low' | 'medium' | 'high';
}

export async function analyzeCosts(): Promise<CostRecommendation[]> {
  const kc = new KubeConfig();
  kc.loadFromDefault();
  const coreApi = kc.makeApiClient(CoreV1Api);
  const appsApi = kc.makeApiClient(AppsV1Api);

  const recommendations: CostRecommendation[] = [];
  const namespaces = await coreApi.listNamespace();

  for (const ns of namespaces.items) {
    const nsName = ns.metadata?.name ?? '';
    if (nsName.startsWith('kube-') || nsName === 'default') continue;

    const pods = await coreApi.listNamespacedPod({ namespace: nsName });

    for (const pod of pods.items) {
      for (const container of pod.spec?.containers ?? []) {
        const limits = container.resources?.limits;
        const requests = container.resources?.requests;

        // Check for over-provisioned resources
        if (limits?.cpu && requests?.cpu) {
          const limitCpu = parseCpu(limits.cpu);
          const requestCpu = parseCpu(requests.cpu);
          if (limitCpu > requestCpu * 4) {
            recommendations.push({
              service: pod.metadata?.labels?.['app'] ?? container.name,
              namespace: nsName,
              currentCost: `CPU limit: ${limits.cpu}`,
              recommendation: `Reduce CPU limit to ${requestCpu * 2}m (2x request)`,
              estimatedSavings: '~30% CPU cost',
              risk: 'low',
            });
          }
        }

        // Check for missing resource requests
        if (!requests?.cpu || !requests?.memory) {
          recommendations.push({
            service: pod.metadata?.labels?.['app'] ?? container.name,
            namespace: nsName,
            currentCost: 'Unbounded resources',
            recommendation: 'Add resource requests to enable efficient scheduling',
            estimatedSavings: '~15-25% cluster utilization improvement',
            risk: 'low',
          });
        }
      }
    }

    // Check for idle deployments (0 traffic)
    const deployments = await appsApi.listNamespacedDeployment({ namespace: nsName });
    for (const dep of deployments.items) {
      const replicas = dep.spec?.replicas ?? 0;
      const available = dep.status?.availableReplicas ?? 0;
      if (replicas > 1 && nsName.includes('dev')) {
        recommendations.push({
          service: dep.metadata?.name ?? '',
          namespace: nsName,
          currentCost: `${replicas} replicas in dev`,
          recommendation: 'Scale dev to 1 replica during off-hours',
          estimatedSavings: `~$${(replicas - 1) * 50}/month`,
          risk: 'low',
        });
      }
    }
  }

  return recommendations;
}

function parseCpu(value: string): number {
  if (value.endsWith('m')) return parseInt(value);
  return parseFloat(value) * 1000;
}
```

## Step 5: Multi-Team Orchestration Workflow

Create a GitHub Actions workflow that orchestrates platform operations across teams:

```yaml
# .github/workflows/platform-orchestration.yml
name: Platform Orchestration

on:
  workflow_dispatch:
    inputs:
      operation:
        description: 'Platform operation'
        type: choice
        options:
          - scaffold-service
          - governance-audit
          - cost-analysis
          - upgrade-templates
      service_name:
        description: 'Service name (for scaffold/audit)'
        type: string
      team:
        description: 'Team name'
        type: string

jobs:
  scaffold:
    if: inputs.operation == 'scaffold-service'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Scaffold service
        run: |
          npx tsx agents/template-agent.ts \
            --name "${{ inputs.service_name }}" \
            --team "${{ inputs.team }}" \
            --template rest-api \
            --language typescript \
            --tier standard
      - name: Create repository
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.repos.createUsingTemplate({
              template_owner: context.repo.owner,
              template_repo: 'golden-path-template',
              owner: context.repo.owner,
              name: '${{ inputs.service_name }}',
              private: true,
              description: 'Auto-scaffolded by Platform Engineering'
            });

  governance:
    if: inputs.operation == 'governance-audit'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        repo: ${{ fromJson(needs.list-repos.outputs.repos) }}
    steps:
      - uses: actions/checkout@v4
        with:
          repository: ${{ matrix.repo }}
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run governance checks
        run: npx tsx agents/governance-agent.ts .
        continue-on-error: true
      - name: Report results
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: '${{ matrix.repo }}'.split('/')[1],
              title: '🏛️ Architecture Governance Violations',
              body: 'Automated governance check detected violations. Please review.',
              labels: ['governance', 'platform-engineering']
            });

  cost-analysis:
    if: inputs.operation == 'cost-analysis'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Analyze costs
        run: npx tsx agents/cost-optimization-agent.ts
      - name: Post report
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('cost-report.md', 'utf-8');
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `💰 Cost Optimization Report — ${new Date().toISOString().split('T')[0]}`,
              body: report,
              labels: ['cost-optimization', 'platform-engineering']
            });
```

## 🎯 Capstone: Build a Complete Internal Developer Platform

Bring all components together into a working IDP:

1. **MCP Server** — expose service scaffolding, deployment, and health checking
2. **Golden Path Templates** — at least 2 language variants (TypeScript + Python)
3. **Governance Agent** — enforce 5+ architectural rules in CI
4. **Cost Optimizer** — weekly reports with actionable savings recommendations
5. **Platform Dashboard** — a simple web UI showing service catalog and health

**Success criteria:**

```
✅ Developer can say "create a new TypeScript REST API called order-service"
   and get a fully configured repository with CI/CD, Helm chart, and monitoring

✅ Every PR runs governance checks and blocks merges for violations

✅ Weekly cost reports are generated with specific savings recommendations

✅ Service health is visible across all environments via MCP tools

✅ New team onboarding takes < 30 minutes with the platform agent
```

**Test your platform end to end:**

```bash
# In Copilot CLI, use the platform MCP server
ghcp

> Use the platform-engineering server to list available templates
> Scaffold a new TypeScript REST API called "payment-service" for the payments team
> Deploy payment-service v1.0.0 to staging
> Check the health of payment-service across all environments
> Run a governance audit on payment-service
```

## 🎯 What You Learned

- Designing an Internal Developer Platform with agentic workflows
- Building MCP servers that expose platform capabilities to Copilot
- Creating golden path templates for consistent service creation
- Implementing automated architecture governance
- Building cost optimization agents for Kubernetes clusters
- Orchestrating multi-team platform operations with GitHub Actions

## 📚 Glossary

- **IDP (Internal Developer Platform)**: A self-service layer that reduces cognitive load for application developers
- **Golden Path**: An opinionated, supported path for building and deploying services
- **Backstage**: An open-source framework for building developer portals (by Spotify)
- **Platform Engineering**: The discipline of building and maintaining internal platforms for developers
- **Governance**: Enforcing architectural standards and compliance rules across teams

## ➡️ Next Steps

Congratulations — you've built a complete agentic developer platform! Explore further:
- 🔒 [Security Audit Agent Pipeline](/Learn-GHCP/courses/persona/security-advanced/) to integrate security into your platform
- Consider contributing your MCP servers and golden path templates to your organization's inner source community
