---
title: "Self-Healing Infrastructure with Agentic Copilot"
description: "Build autonomous infrastructure management using Copilot agents for monitoring, incident response, and self-healing systems."
track: "persona"
difficulty: "advanced"
featureRefs:
  - copilot-agents
  - copilot-cli
  - mcp-integration
personaTags:
  - devops
  - architect
technologyTags:
  - terraform
  - kubernetes
  - github-actions
  - mcp
prerequisites:
  - devops-intermediate
estimatedMinutes: 75
lastGenerated: 2026-04-08
published: true
---

# 🔴 Self-Healing Infrastructure with Agentic Copilot

In this advanced course you'll build autonomous infrastructure systems that use Copilot agents for monitoring, incident detection, automated response, and self-healing. You'll create MCP servers that expose infrastructure tools and orchestrate multi-agent workflows.

## Prerequisites

- Completed [Infrastructure as Code with Copilot](/Learn-GHCP/courses/persona/devops-intermediate/)
- Strong Terraform and Kubernetes experience
- Familiarity with the MCP protocol concepts
- Understanding of incident management processes

## Step 1: Agentic Infrastructure Management

Agentic workflows let Copilot take autonomous actions based on infrastructure events. The pattern is: **detect → diagnose → remediate → verify**.

### The self-healing architecture

```
┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│  Monitoring  │────▶│  Detection   │────▶│  Diagnosis    │
│  Prometheus  │     │  Alert Rules │     │  Copilot Agent│
│  CloudWatch  │     │  Anomaly Det │     │  Root Cause   │
└──────────────┘     └──────────────┘     └───────┬───────┘
                                                   │
┌──────────────┐     ┌──────────────┐              │
│ Verification │◀────│ Remediation  │◀─────────────┘
│  Smoke Tests │     │  Auto-Scale  │
│  Health Check│     │  Restart Pod │
│  Rollback    │     │  Revert Deploy│
└──────────────┘     └──────────────┘
```

### Create the event handler

Create `.github/workflows/self-heal.yml`:

```yaml
name: Self-Healing Infrastructure

on:
  repository_dispatch:
    types:
      - infrastructure-alert
      - deployment-failure
      - health-check-failure

permissions:
  contents: read
  issues: write
  actions: write

jobs:
  diagnose:
    runs-on: ubuntu-latest
    outputs:
      action: ${{ steps.analysis.outputs.action }}
      severity: ${{ steps.analysis.outputs.severity }}
      details: ${{ steps.analysis.outputs.details }}
    steps:
      - uses: actions/checkout@v4

      - name: Analyze alert
        id: analysis
        uses: actions/github-script@v7
        with:
          script: |
            const alert = context.payload.client_payload;
            console.log('Received alert:', JSON.stringify(alert, null, 2));

            // Classify the alert and determine action
            const alertType = alert.type || 'unknown';
            let action = 'investigate';
            let severity = 'low';

            switch (alertType) {
              case 'high-error-rate':
                action = alert.error_rate > 0.5 ? 'rollback' : 'scale-up';
                severity = alert.error_rate > 0.5 ? 'critical' : 'high';
                break;
              case 'pod-crash-loop':
                action = 'restart-deployment';
                severity = 'high';
                break;
              case 'memory-pressure':
                action = 'scale-up';
                severity = 'medium';
                break;
              case 'certificate-expiring':
                action = 'renew-certificate';
                severity = 'medium';
                break;
              default:
                action = 'investigate';
                severity = 'low';
            }

            core.setOutput('action', action);
            core.setOutput('severity', severity);
            core.setOutput('details', JSON.stringify(alert));

  remediate:
    needs: diagnose
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Execute remediation
        run: |
          ACTION="${{ needs.diagnose.outputs.action }}"
          echo "Executing remediation: $ACTION"

          case $ACTION in
            rollback)
              echo "Rolling back to last known good deployment..."
              # kubectl rollout undo deployment/web-app
              # terraform apply -target=module.ecs -var="image_tag=$LAST_GOOD_TAG"
              ;;
            scale-up)
              echo "Scaling up to handle load..."
              # kubectl scale deployment/web-app --replicas=10
              ;;
            restart-deployment)
              echo "Restarting deployment..."
              # kubectl rollout restart deployment/web-app
              ;;
            renew-certificate)
              echo "Triggering certificate renewal..."
              # certbot renew --non-interactive
              ;;
            investigate)
              echo "Creating investigation issue..."
              ;;
          esac

      - name: Create incident issue
        if: needs.diagnose.outputs.severity == 'critical' || needs.diagnose.outputs.severity == 'high'
        uses: actions/github-script@v7
        with:
          script: |
            const severity = '${{ needs.diagnose.outputs.severity }}';
            const action = '${{ needs.diagnose.outputs.action }}';
            const details = JSON.parse('${{ needs.diagnose.outputs.details }}');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🚨 [${severity.toUpperCase()}] Infrastructure Alert: ${action}`,
              body: [
                `## Automated Incident Report`,
                ``,
                `**Severity:** ${severity}`,
                `**Action Taken:** ${action}`,
                `**Timestamp:** ${new Date().toISOString()}`,
                ``,
                `### Alert Details`,
                '```json',
                JSON.stringify(details, null, 2),
                '```',
                ``,
                `### Remediation`,
                `Automated remediation was executed. Verify the system has recovered.`,
                ``,
                `### Runbook`,
                `See [runbook for ${action}](../docs/runbooks/${action}.md)`,
              ].join('\n'),
              labels: ['incident', `severity:${severity}`, 'automated'],
            });

  verify:
    needs: [diagnose, remediate]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Wait for stabilization
        run: sleep 120

      - name: Run health checks
        run: |
          echo "Verifying system health..."
          # Health check endpoints
          ENDPOINTS=(
            "https://app.example.com/health"
            "https://api.example.com/health"
          )

          ALL_HEALTHY=true
          for endpoint in "${ENDPOINTS[@]}"; do
            echo "Checking $endpoint..."
            # HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
            # if [ "$HTTP_STATUS" != "200" ]; then
            #   echo "UNHEALTHY: $endpoint returned $HTTP_STATUS"
            #   ALL_HEALTHY=false
            # fi
          done

          if [ "$ALL_HEALTHY" = false ]; then
            echo "::error::System health check failed after remediation"
            exit 1
          fi

          echo "✅ All health checks passed"

      - name: Run smoke tests
        run: |
          echo "Running smoke tests..."
          # npm run test:smoke -- --target=production
```

## Step 2: MCP Server for Infrastructure Tools

Build an MCP server that gives Copilot direct access to your infrastructure state.

### Create `infra-mcp-server.ts`

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "infra-tools", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// ---- Tools: Actions the agent can take ----

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "k8s_get_pods",
      description: "List pods in a Kubernetes namespace with their status",
      inputSchema: {
        type: "object" as const,
        properties: {
          namespace: { type: "string", description: "Kubernetes namespace" },
          label_selector: { type: "string", description: "Label selector (e.g. app=web)" },
        },
        required: ["namespace"],
      },
    },
    {
      name: "k8s_scale_deployment",
      description: "Scale a Kubernetes deployment to a target replica count",
      inputSchema: {
        type: "object" as const,
        properties: {
          namespace: { type: "string" },
          deployment: { type: "string" },
          replicas: { type: "number", description: "Target replica count" },
        },
        required: ["namespace", "deployment", "replicas"],
      },
    },
    {
      name: "k8s_rollback_deployment",
      description: "Roll back a Kubernetes deployment to the previous revision",
      inputSchema: {
        type: "object" as const,
        properties: {
          namespace: { type: "string" },
          deployment: { type: "string" },
        },
        required: ["namespace", "deployment"],
      },
    },
    {
      name: "terraform_plan",
      description: "Run terraform plan on a given workspace and return the summary",
      inputSchema: {
        type: "object" as const,
        properties: {
          workspace: { type: "string", description: "Terraform workspace name" },
          target: { type: "string", description: "Optional resource target" },
        },
        required: ["workspace"],
      },
    },
    {
      name: "query_metrics",
      description: "Query Prometheus metrics for a service",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "PromQL query" },
          range: { type: "string", description: "Time range (e.g. 1h, 6h, 24h)", default: "1h" },
        },
        required: ["query"],
      },
    },
    {
      name: "check_ssl_certificate",
      description: "Check SSL certificate expiration for a domain",
      inputSchema: {
        type: "object" as const,
        properties: {
          domain: { type: "string", description: "Domain name to check" },
        },
        required: ["domain"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "k8s_get_pods": {
      const ns = args?.namespace as string;
      const selector = args?.label_selector as string;
      // In production: exec `kubectl get pods -n ${ns} -l ${selector} -o json`
      return {
        content: [{
          type: "text",
          text: `Pods in namespace "${ns}"${selector ? ` (selector: ${selector})` : ""}:\n` +
            `NAME                        READY   STATUS    RESTARTS   AGE\n` +
            `web-app-6d4f8b7c9-abc12    1/1     Running   0          2h\n` +
            `web-app-6d4f8b7c9-def34    1/1     Running   0          2h\n` +
            `web-app-6d4f8b7c9-ghi56    0/1     CrashLoopBackOff   5   15m\n`,
        }],
      };
    }

    case "k8s_scale_deployment": {
      const ns = args?.namespace as string;
      const deploy = args?.deployment as string;
      const replicas = args?.replicas as number;
      return {
        content: [{
          type: "text",
          text: `✅ Scaled deployment "${deploy}" in namespace "${ns}" to ${replicas} replicas.\n` +
            `Current rollout status: 2/${replicas} pods ready, waiting for ${replicas - 2} more...`,
        }],
      };
    }

    case "k8s_rollback_deployment": {
      const ns = args?.namespace as string;
      const deploy = args?.deployment as string;
      return {
        content: [{
          type: "text",
          text: `✅ Rolled back deployment "${deploy}" in namespace "${ns}" to revision 4.\n` +
            `Previous image: myregistry.azurecr.io/web-app:v2.3.1\n` +
            `Current image:  myregistry.azurecr.io/web-app:v2.3.0\n` +
            `Rollout status: 3/3 pods ready.`,
        }],
      };
    }

    case "terraform_plan": {
      const workspace = args?.workspace as string;
      const target = args?.target as string;
      return {
        content: [{
          type: "text",
          text: `Terraform plan for workspace "${workspace}"${target ? ` (target: ${target})` : ""}:\n\n` +
            `Plan: 2 to add, 1 to change, 0 to destroy.\n\n` +
            `Changes:\n` +
            `  + aws_ecs_service.web_app (new)\n` +
            `  + aws_ecs_task_definition.web_app (new)\n` +
            `  ~ aws_security_group.ecs_tasks (update in-place)\n`,
        }],
      };
    }

    case "query_metrics": {
      const query = args?.query as string;
      const range = (args?.range as string) || "1h";
      return {
        content: [{
          type: "text",
          text: `PromQL: ${query} (range: ${range})\n\n` +
            `Results:\n` +
            `  web-app (instance=pod-abc12): avg=0.45, max=2.1, p95=1.8\n` +
            `  web-app (instance=pod-def34): avg=0.38, max=1.9, p95=1.5\n` +
            `  web-app (instance=pod-ghi56): avg=NaN (pod in CrashLoopBackOff)\n`,
        }],
      };
    }

    case "check_ssl_certificate": {
      const domain = args?.domain as string;
      return {
        content: [{
          type: "text",
          text: `SSL certificate for ${domain}:\n` +
            `  Issuer:     Let's Encrypt (R3)\n` +
            `  Valid from: 2026-01-15\n` +
            `  Expires:    2026-04-15 (⚠️ 7 days remaining!)\n` +
            `  Algorithm:  RSA 2048\n` +
            `  Status:     VALID but EXPIRING SOON`,
        }],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  }
});

// ---- Resources: Read-only data the agent can access ----

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "infra://topology/services",
      name: "Service Topology",
      description: "Current service dependency map and health status",
      mimeType: "application/json",
    },
    {
      uri: "infra://runbooks/index",
      name: "Runbook Index",
      description: "List of available incident runbooks",
      mimeType: "text/markdown",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === "infra://topology/services") {
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({
          services: [
            { name: "web-app", status: "degraded", dependencies: ["api-service", "database"] },
            { name: "api-service", status: "healthy", dependencies: ["database", "cache"] },
            { name: "database", status: "healthy", dependencies: [] },
            { name: "cache", status: "healthy", dependencies: [] },
          ],
        }, null, 2),
      }],
    };
  }

  if (uri === "infra://runbooks/index") {
    return {
      contents: [{
        uri,
        mimeType: "text/markdown",
        text: [
          "# Runbook Index",
          "",
          "| ID | Title | Severity | Last Updated |",
          "|-----|-------|----------|-------------|",
          "| RB-001 | High Error Rate Response | Critical | 2026-03-15 |",
          "| RB-002 | Pod CrashLoopBackOff | High | 2026-03-20 |",
          "| RB-003 | Database Connection Pool Exhaustion | Critical | 2026-04-01 |",
          "| RB-004 | SSL Certificate Renewal | Medium | 2026-02-28 |",
          "| RB-005 | Memory Pressure and OOMKill | High | 2026-03-10 |",
        ].join("\n"),
      }],
    };
  }

  return { contents: [] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Infrastructure MCP server running on stdio");
}

main().catch(console.error);
```

### Register in VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "infra-tools": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "infra-mcp-server.ts"]
    }
  }
}
```

Now you can ask Copilot:

```
One of our pods is crash-looping. Check the pods in the default namespace,
query the error rate metrics, and recommend whether to rollback or restart.
```

## Step 3: Automated Incident Response

Build a GitHub Actions workflow that responds to PagerDuty/Opsgenie alerts automatically:

### Create `scripts/incident-responder.ts`

```typescript
interface Alert {
  id: string;
  service: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  timestamp: string;
  metrics?: Record<string, number>;
}

interface RemediationPlan {
  steps: RemediationStep[];
  estimatedRecoveryMinutes: number;
  requiresApproval: boolean;
}

interface RemediationStep {
  action: string;
  command: string;
  rollbackCommand: string;
  timeout: number;
}

function buildRemediationPlan(alert: Alert): RemediationPlan {
  const errorRate = alert.metrics?.error_rate ?? 0;
  const cpuUsage = alert.metrics?.cpu_usage ?? 0;
  const memoryUsage = alert.metrics?.memory_usage ?? 0;

  const steps: RemediationStep[] = [];
  let requiresApproval = false;

  // High error rate: check if it's a bad deploy
  if (errorRate > 0.1) {
    steps.push({
      action: "Check recent deployments",
      command: `kubectl rollout history deployment/${alert.service} -n production`,
      rollbackCommand: "",
      timeout: 30,
    });

    if (errorRate > 0.5) {
      steps.push({
        action: "Rollback to previous version",
        command: `kubectl rollout undo deployment/${alert.service} -n production`,
        rollbackCommand: `kubectl rollout undo deployment/${alert.service} -n production`,
        timeout: 120,
      });
      requiresApproval = alert.severity === "critical";
    }
  }

  // CPU pressure: scale horizontally
  if (cpuUsage > 80) {
    const currentReplicas = 3;
    const targetReplicas = Math.min(currentReplicas * 2, 20);
    steps.push({
      action: `Scale up from ${currentReplicas} to ${targetReplicas} replicas`,
      command: `kubectl scale deployment/${alert.service} -n production --replicas=${targetReplicas}`,
      rollbackCommand: `kubectl scale deployment/${alert.service} -n production --replicas=${currentReplicas}`,
      timeout: 180,
    });
  }

  // Memory pressure: restart pods to clear leaks
  if (memoryUsage > 90) {
    steps.push({
      action: "Rolling restart to clear memory leaks",
      command: `kubectl rollout restart deployment/${alert.service} -n production`,
      rollbackCommand: "",
      timeout: 300,
    });
  }

  // Always end with health verification
  steps.push({
    action: "Verify system health",
    command: `curl --fail --max-time 10 https://${alert.service}.example.com/health`,
    rollbackCommand: "",
    timeout: 60,
  });

  return {
    steps,
    estimatedRecoveryMinutes: steps.reduce((sum, s) => sum + s.timeout, 0) / 60,
    requiresApproval,
  };
}

async function executeRemediationPlan(plan: RemediationPlan): Promise<boolean> {
  console.log(`Executing ${plan.steps.length} remediation steps...`);
  console.log(`Estimated recovery: ${plan.estimatedRecoveryMinutes.toFixed(1)} minutes`);

  if (plan.requiresApproval) {
    console.log("⚠️  This plan requires manual approval before execution.");
    return false;
  }

  const executedSteps: RemediationStep[] = [];

  for (const step of plan.steps) {
    console.log(`\n▶ ${step.action}`);
    console.log(`  Command: ${step.command}`);

    try {
      // In production: exec the command and check exit code
      console.log(`  ✅ Step completed successfully`);
      executedSteps.push(step);
    } catch (error) {
      console.error(`  ❌ Step failed: ${error}`);
      console.log("  Rolling back executed steps...");

      for (const executed of executedSteps.reverse()) {
        if (executed.rollbackCommand) {
          console.log(`  ↩ Rolling back: ${executed.rollbackCommand}`);
        }
      }
      return false;
    }
  }

  console.log("\n✅ All remediation steps completed successfully");
  return true;
}

export { buildRemediationPlan, executeRemediationPlan };
export type { Alert, RemediationPlan, RemediationStep };
```

## Step 4: Multi-Agent Orchestration

Design a system where multiple Copilot agents collaborate on complex infrastructure tasks.

### Agent roles

```typescript
interface AgentRole {
  name: string;
  responsibility: string;
  tools: string[];
  escalatesTo: string | null;
}

const agentRoles: AgentRole[] = [
  {
    name: "monitor-agent",
    responsibility: "Continuously watch metrics and detect anomalies",
    tools: ["query_metrics", "check_ssl_certificate"],
    escalatesTo: "diagnosis-agent",
  },
  {
    name: "diagnosis-agent",
    responsibility: "Analyze alerts and determine root cause",
    tools: ["k8s_get_pods", "query_metrics", "get_runbook"],
    escalatesTo: "remediation-agent",
  },
  {
    name: "remediation-agent",
    responsibility: "Execute fixes and verify recovery",
    tools: ["k8s_scale_deployment", "k8s_rollback_deployment", "terraform_plan"],
    escalatesTo: null,
  },
];
```

### Orchestration workflow

Create `scripts/orchestrator.ts`:

```typescript
type AgentPhase = "monitoring" | "diagnosing" | "remediating" | "verifying" | "resolved";

interface IncidentState {
  id: string;
  phase: AgentPhase;
  alert: { service: string; type: string; severity: string };
  diagnosis: string | null;
  actionsToken: string[];
  startedAt: Date;
  resolvedAt: Date | null;
}

class IncidentOrchestrator {
  private incidents: Map<string, IncidentState> = new Map();

  async handleAlert(alert: IncidentState["alert"]): Promise<string> {
    const id = `INC-${Date.now()}`;
    const incident: IncidentState = {
      id,
      phase: "monitoring",
      alert,
      diagnosis: null,
      actionsToken: [],
      startedAt: new Date(),
      resolvedAt: null,
    };
    this.incidents.set(id, incident);

    // Phase 1: Monitoring agent confirms the alert is real
    incident.phase = "diagnosing";
    console.log(`[${id}] Phase: Diagnosing alert for ${alert.service}`);

    // Phase 2: Diagnosis agent determines root cause
    incident.diagnosis = await this.diagnose(incident);
    console.log(`[${id}] Diagnosis: ${incident.diagnosis}`);

    // Phase 3: Remediation agent executes the fix
    incident.phase = "remediating";
    const actions = await this.remediate(incident);
    incident.actionsToken.push(...actions);
    console.log(`[${id}] Actions taken: ${actions.join(", ")}`);

    // Phase 4: Verify recovery
    incident.phase = "verifying";
    const recovered = await this.verify(incident);

    if (recovered) {
      incident.phase = "resolved";
      incident.resolvedAt = new Date();
      const duration = (incident.resolvedAt.getTime() - incident.startedAt.getTime()) / 1000;
      console.log(`[${id}] ✅ Resolved in ${duration}s`);
    } else {
      console.log(`[${id}] ⚠️ Verification failed — escalating to on-call`);
    }

    return id;
  }

  private async diagnose(incident: IncidentState): Promise<string> {
    // In production: call MCP tools to inspect pods, metrics, logs
    return `${incident.alert.type} detected on ${incident.alert.service}`;
  }

  private async remediate(incident: IncidentState): Promise<string[]> {
    // In production: call MCP tools to scale, rollback, restart
    return ["scaled-up", "restarted-pods"];
  }

  private async verify(incident: IncidentState): Promise<boolean> {
    // In production: run health checks and smoke tests
    return true;
  }
}

export { IncidentOrchestrator };
```

## 🎯 Capstone: Build an Autonomous Infrastructure System

Combine all components into a self-healing infrastructure platform:

### Components to build

1. **MCP Server** — Expose K8s, Terraform, and monitoring tools to Copilot
2. **Alert Handler** — GitHub Actions workflow triggered by monitoring alerts
3. **Incident Responder** — TypeScript module that builds and executes remediation plans
4. **Multi-Agent Orchestrator** — Coordinate detection, diagnosis, and remediation
5. **Verification Pipeline** — Automated smoke tests and health checks post-remediation

### Acceptance criteria

- [ ] MCP server responds to all 6 infrastructure tool calls
- [ ] Alert handler workflow triggers on `repository_dispatch` events
- [ ] Incident responder generates correct plans for error-rate, CPU, and memory alerts
- [ ] Orchestrator progresses through all phases (monitor → diagnose → remediate → verify)
- [ ] Failed remediation triggers rollback of previously executed steps
- [ ] Critical incidents create GitHub Issues automatically
- [ ] A README documents the architecture and setup process

### Test the system end-to-end

```bash
# Simulate an alert via repository dispatch
gh api repos/OWNER/REPO/dispatches \
  --method POST \
  -f event_type=infrastructure-alert \
  -f 'client_payload={"type":"high-error-rate","service":"web-app","error_rate":0.35,"severity":"high"}'

# Verify the workflow ran
gh run list --workflow=self-heal.yml --limit=1
```

## 🎯 What You Learned

- Designing self-healing infrastructure architectures
- Building MCP servers that expose infrastructure tools with resources and actions
- Creating automated incident response workflows with GitHub Actions
- Building remediation planners with rollback support
- Orchestrating multi-agent workflows for complex infrastructure operations
- End-to-end testing of autonomous infrastructure systems

## 📚 Glossary

- **Self-healing**: Infrastructure that automatically detects and fixes problems without human intervention
- **Remediation plan**: An ordered list of steps to resolve an infrastructure issue
- **Circuit breaker**: A pattern that stops cascading failures by halting unhealthy operations
- **MCP resource**: Read-only data exposed by an MCP server for agent consumption
- **Multi-agent orchestration**: Coordinating multiple AI agents with distinct roles on a shared task
- **Repository dispatch**: A GitHub API event used to trigger workflows programmatically

## ➡️ Next Steps

You've mastered Copilot for DevOps! Explore related tracks:
- 🔴 [Copilot Power User: Custom Tools and Automation](/Learn-GHCP/courses/persona/developer-advanced/)
- 🟢 [Copilot for Data Science: AI-Powered Analysis](/Learn-GHCP/courses/persona/data-scientist-beginner/)
