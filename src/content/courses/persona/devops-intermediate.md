---
title: "Infrastructure as Code with Copilot"
description: "Build complete Terraform modules, Kubernetes manifests, and CI/CD pipelines using Copilot's contextual awareness."
track: "persona"
difficulty: "intermediate"
featureRefs:
  - code-completions
  - copilot-chat
  - agent-mode
personaTags:
  - devops
technologyTags:
  - terraform
  - kubernetes
  - github-actions
  - docker
prerequisites:
  - devops-beginner
estimatedMinutes: 45
lastGenerated: 2026-04-08
published: true
---

# 🟡 Infrastructure as Code with Copilot

In this intermediate course you'll build production-grade infrastructure using Copilot's contextual awareness — from reusable Terraform modules to Kubernetes deployments and multi-stage CI/CD pipelines.

## Prerequisites

- Completed [Copilot for DevOps: AI-Assisted Infrastructure](/Learn-GHCP/courses/persona/devops-beginner/)
- Working knowledge of Terraform and Kubernetes
- A cloud provider account (AWS, Azure, or GCP) for testing
- `kubectl` and `terraform` CLI tools installed

## Step 1: Reusable Terraform Modules

Copilot can generate complete Terraform modules when given proper context. Let's build an ECS Fargate module.

### Create the module structure

```bash
mkdir -p modules/ecs-fargate
touch modules/ecs-fargate/{main.tf,variables.tf,outputs.tf}
```

### Define variables first

Open `modules/ecs-fargate/variables.tf` and type descriptive variable blocks:

```hcl
variable "app_name" {
  description = "Name of the application"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "container_image" {
  description = "Docker image URI for the application"
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 3000
}

variable "cpu" {
  description = "Fargate task CPU units (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate task memory in MB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of task instances to run"
  type        = number
  default     = 2
}

variable "vpc_id" {
  description = "VPC ID where the service will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ECS tasks"
  type        = list(string)
}

variable "health_check_path" {
  description = "HTTP health check endpoint path"
  type        = string
  default     = "/health"
}
```

> 🔑 **Key insight:** By defining variables first, you give Copilot the full context of what the module expects. Open both `variables.tf` and `main.tf` side-by-side so Copilot can reference your variables.

### Generate the main resources

Open `modules/ecs-fargate/main.tf` and add:

```hcl
# ECS Fargate module
# Creates: ECS cluster, task definition, service, ALB, security groups, IAM roles
# Uses variables defined in variables.tf
# Includes auto-scaling, CloudWatch logging, and health checks

resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Application = var.app_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.app_name}-${var.environment}"
  retention_in_days = var.environment == "prod" ? 90 : 14

  tags = {
    Application = var.app_name
    Environment = var.environment
  }
}

# IAM role for ECS task execution
resource "aws_iam_role" "ecs_execution" {
  name = "${var.app_name}-${var.environment}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task definition with logging and health check
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.app_name}-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([{
    name  = var.app_name
    image = var.container_image
    portMappings = [{
      containerPort = var.container_port
      protocol      = "tcp"
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${var.container_port}${var.health_check_path} || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

data "aws_region" "current" {}

# Security group for ECS tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.app_name}-${var.environment}-ecs-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = var.container_port
    to_port     = var.container_port
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Allow traffic from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ECS service
resource "aws_ecs_service" "app" {
  name            = "${var.app_name}-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
```

### Generate outputs

Open `modules/ecs-fargate/outputs.tf`:

```hcl
output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.app.name
}

output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.app.arn
}

output "security_group_id" {
  description = "Security group ID for the ECS tasks"
  value       = aws_security_group.ecs_tasks.id
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.app.name
}
```

## Step 2: Kubernetes Manifests with Copilot

Copilot generates production-ready K8s manifests when you provide clear intent.

### Create a deployment

Create `k8s/deployment.yaml`:

```yaml
# Kubernetes Deployment for a Node.js web application
# - 3 replicas with rolling update strategy
# - Resource limits: 256Mi memory, 250m CPU
# - Liveness and readiness probes on /health
# - Environment variables from a ConfigMap and Secret
# - Pod anti-affinity to spread across nodes
# - Graceful shutdown with preStop hook

apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web-app
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: web-app
        version: v1
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - web-app
                topologyKey: kubernetes.io/hostname
      terminationGracePeriodSeconds: 30
      containers:
        - name: web-app
          image: myregistry.azurecr.io/web-app:latest
          ports:
            - containerPort: 3000
              protocol: TCP
          resources:
            requests:
              memory: "128Mi"
              cpu: "125m"
            limits:
              memory: "256Mi"
              cpu: "250m"
          envFrom:
            - configMapRef:
                name: web-app-config
            - secretRef:
                name: web-app-secrets
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 20
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
```

### Generate a HorizontalPodAutoscaler

Create `k8s/hpa.yaml`:

```yaml
# HPA to scale the web-app between 3 and 10 replicas
# Scale up at 70% CPU utilization
# Scale up at 80% memory utilization
# Stabilize scale-down over 5 minutes to avoid flapping

apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
```

## Step 3: Multi-Stage CI/CD Pipelines

Use agent mode to build a complete deployment pipeline with environments.

### In Copilot Chat (Agent mode):

```
Create a GitHub Actions deployment pipeline with these stages:
1. Build and test (on every PR and push to main)
2. Build Docker image and push to GitHub Container Registry
3. Deploy to staging automatically when merged to main
4. Deploy to production with manual approval
5. Run smoke tests after each deployment
6. Rollback on smoke test failure

Use GitHub Environments for staging and production.
Use OIDC for cloud authentication (no long-lived secrets).
```

Copilot generates `deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  packages: write
  id-token: write

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm test

  build-image:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}

  deploy-staging:
    needs: build-image
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          echo "Deploying ${{ needs.build-image.outputs.image-tag }} to staging"
          # kubectl set image deployment/web-app web-app=$IMAGE_TAG

  smoke-test-staging:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run smoke tests
        run: |
          echo "Running smoke tests against staging..."
          # curl --fail https://staging.example.com/health
          # npm run test:smoke -- --target=staging

  deploy-production:
    needs: smoke-test-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          echo "Deploying to production"
          # kubectl set image deployment/web-app web-app=$IMAGE_TAG

  smoke-test-production:
    needs: deploy-production
    runs-on: ubuntu-latest
    steps:
      - name: Run production smoke tests
        run: |
          echo "Running production smoke tests..."
          # curl --fail https://app.example.com/health
```

## Step 4: Secret Management Patterns

Ask Copilot Chat to generate secret management configurations:

```
Generate a Kubernetes ExternalSecret that syncs database credentials
from AWS Secrets Manager into a K8s Secret, with automatic rotation
every 15 minutes
```

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_HOST
      remoteRef:
        key: myapp/production/database
        property: host
    - secretKey: DB_PASSWORD
      remoteRef:
        key: myapp/production/database
        property: password
    - secretKey: DB_USERNAME
      remoteRef:
        key: myapp/production/database
        property: username
```

## Step 5: Monitoring Configuration

Use Copilot to generate monitoring dashboards and alert rules:

```yaml
# Prometheus alert rules for a web application
# Alert on: high error rate, slow responses, pod restarts, disk pressure

apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: web-app-alerts
spec:
  groups:
    - name: web-app.rules
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{job="web-app", status=~"5.."}[5m]))
            / sum(rate(http_requests_total{job="web-app"}[5m])) > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High error rate detected"
            description: "Error rate is above 5% for the last 5 minutes"

        - alert: SlowResponseTime
          expr: |
            histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="web-app"}[5m])) by (le))
            > 2
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Slow response times"
            description: "95th percentile latency is above 2 seconds"

        - alert: PodRestartLoop
          expr: increase(kube_pod_container_status_restarts_total{namespace="default", container="web-app"}[1h]) > 3
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Pod restart loop detected"
            description: "Pod has restarted more than 3 times in the last hour"
```

## 🎯 Hands-On Exercise: Build a Complete Deployment Pipeline

Create a production-ready infrastructure setup:

1. **Terraform module** for an ECS Fargate service with ALB
2. **Kubernetes manifests** — Deployment, Service, HPA, NetworkPolicy
3. **GitHub Actions pipeline** — Build, test, push image, deploy to staging/prod
4. **Monitoring** — Prometheus alerting rules for SLO monitoring

Use Copilot's agent mode to generate each component. Validate with:

```bash
terraform validate
kubectl apply --dry-run=client -f k8s/
actionlint .github/workflows/deploy.yml
```

## 🎯 What You Learned

- Building reusable Terraform modules with Copilot's contextual awareness
- Generating production-grade Kubernetes manifests
- Creating multi-stage CI/CD pipelines with environments and approvals
- Secret management patterns using ExternalSecrets
- Monitoring and alerting configuration generation

## 📚 Glossary

- **Terraform module**: A reusable, parameterized set of Terraform resources
- **HPA**: Horizontal Pod Autoscaler — automatically scales pods based on metrics
- **OIDC**: OpenID Connect — used for keyless authentication in CI/CD
- **ExternalSecret**: A K8s resource that syncs secrets from external providers
- **Circuit breaker**: A deployment safety mechanism that rolls back failed deployments

## ➡️ Next Steps

Ready for autonomous infrastructure? Continue to the advanced course:
- 🔴 [Self-Healing Infrastructure with Agentic Copilot](/Learn-GHCP/courses/persona/devops-advanced/)
