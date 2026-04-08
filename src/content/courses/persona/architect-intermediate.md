---
title: "System Design with Copilot Agent Mode"
description: "Use Copilot's agent mode to scaffold complete system architectures, generate API contracts, and create infrastructure templates."
track: "persona"
difficulty: "intermediate"
featureRefs:
  - agent-mode
  - copilot-chat
  - copilot-cli
personaTags:
  - architect
technologyTags:
  - architecture
  - openapi
  - terraform
  - typescript
prerequisites:
  - architect-beginner
estimatedMinutes: 45
lastGenerated: 2026-04-08
published: true
---

# 🟡 System Design with Copilot Agent Mode

In this intermediate course you'll use Copilot's agent mode to move from design to implementation — scaffolding real project structures, generating API contracts, and creating infrastructure-as-code templates.

## Prerequisites

- Completed [Copilot for Architects: AI-Assisted Design](/Learn-GHCP/courses/persona/architect-beginner/)
- Familiarity with REST APIs and OpenAPI specifications
- Basic understanding of infrastructure-as-code (Terraform or similar)

## The Scenario: Designing a New Microservice

Your team needs a **Notification Service** for the e-commerce platform. It must:
- Send emails, SMS, and push notifications
- Support templated messages with variable substitution
- Provide delivery tracking and retry logic
- Expose REST APIs for other services and a management dashboard
- Scale to 100,000 notifications per hour

## Step 1: Scaffold the Project Structure with Agent Mode

Open Copilot Chat in agent mode and prompt:

```
@workspace /new Create a Node.js microservice project structure for a Notification Service.
Use TypeScript, Express, and Prisma. Include:
- Domain-driven design folder structure
- OpenAPI spec placeholder
- Docker and docker-compose files
- GitHub Actions CI/CD workflow
- Environment configuration with dotenv
- Jest testing setup
```

**Expected project structure:**

```
notification-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── notification.ts
│   │   │   └── template.ts
│   │   ├── repositories/
│   │   │   └── notification-repository.ts
│   │   └── services/
│   │       └── notification-service.ts
│   ├── application/
│   │   ├── commands/
│   │   │   ├── send-notification.ts
│   │   │   └── create-template.ts
│   │   └── queries/
│   │       └── get-notification-status.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── prisma/
│   │   │       └── schema.prisma
│   │   ├── messaging/
│   │   │   └── rabbitmq-consumer.ts
│   │   └── providers/
│   │       ├── email-provider.ts
│   │       ├── sms-provider.ts
│   │       └── push-provider.ts
│   ├── api/
│   │   ├── routes/
│   │   │   ├── notification-routes.ts
│   │   │   └── template-routes.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── validation.ts
│   │   └── openapi.yaml
│   └── index.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker-compose.yml
├── Dockerfile
├── .github/workflows/ci.yml
├── package.json
└── tsconfig.json
```

## Step 2: Generate the OpenAPI Specification

Use agent mode to generate a complete API contract:

```
@workspace In agent mode, generate a complete OpenAPI 3.1 spec for the Notification Service.
Include endpoints for: sending notifications (single and batch), managing templates,
querying delivery status, and webhook callbacks. Add request/response schemas with
examples and error responses.
```

**Generated specification (key sections):**

```yaml
# src/api/openapi.yaml
openapi: 3.1.0
info:
  title: Notification Service API
  version: 1.0.0
  description: Microservice for multi-channel notifications with template support

servers:
  - url: http://localhost:3000/api/v1
    description: Local development

paths:
  /notifications:
    post:
      operationId: sendNotification
      summary: Send a notification
      tags: [Notifications]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SendNotificationRequest'
            example:
              channel: email
              recipient: "user@example.com"
              templateId: "welcome-email"
              variables:
                userName: "Alice"
                activationLink: "https://app.example.com/activate/abc123"
              priority: high
      responses:
        '202':
          description: Notification accepted for delivery
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '429':
          $ref: '#/components/responses/RateLimited'

  /notifications/batch:
    post:
      operationId: sendBatchNotification
      summary: Send notifications to multiple recipients
      tags: [Notifications]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BatchNotificationRequest'
      responses:
        '202':
          description: Batch accepted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchNotificationResponse'

  /notifications/{id}/status:
    get:
      operationId: getNotificationStatus
      summary: Get delivery status of a notification
      tags: [Notifications]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Notification status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationStatus'
              example:
                id: "550e8400-e29b-41d4-a716-446655440000"
                channel: email
                status: delivered
                attempts: 1
                createdAt: "2026-04-08T10:30:00Z"
                deliveredAt: "2026-04-08T10:30:02Z"
        '404':
          $ref: '#/components/responses/NotFound'

  /templates:
    post:
      operationId: createTemplate
      summary: Create a notification template
      tags: [Templates]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTemplateRequest'
            example:
              id: "welcome-email"
              channel: email
              subject: "Welcome, {{userName}}!"
              body: "Hi {{userName}}, click {{activationLink}} to get started."
              variables:
                - name: userName
                  required: true
                - name: activationLink
                  required: true
      responses:
        '201':
          description: Template created
    get:
      operationId: listTemplates
      summary: List all notification templates
      tags: [Templates]
      parameters:
        - name: channel
          in: query
          schema:
            type: string
            enum: [email, sms, push]
      responses:
        '200':
          description: Template list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Template'

components:
  schemas:
    SendNotificationRequest:
      type: object
      required: [channel, recipient, templateId]
      properties:
        channel:
          type: string
          enum: [email, sms, push]
        recipient:
          type: string
        templateId:
          type: string
        variables:
          type: object
          additionalProperties:
            type: string
        priority:
          type: string
          enum: [low, normal, high, critical]
          default: normal

    NotificationResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        status:
          type: string
          enum: [queued, sending, delivered, failed]
        estimatedDelivery:
          type: string
          format: date-time

    NotificationStatus:
      type: object
      properties:
        id:
          type: string
          format: uuid
        channel:
          type: string
        status:
          type: string
          enum: [queued, sending, delivered, failed, bounced]
        attempts:
          type: integer
        createdAt:
          type: string
          format: date-time
        deliveredAt:
          type: string
          format: date-time
          nullable: true
        errorMessage:
          type: string
          nullable: true

    BatchNotificationRequest:
      type: object
      required: [channel, recipients, templateId]
      properties:
        channel:
          type: string
          enum: [email, sms, push]
        recipients:
          type: array
          items:
            type: string
          maxItems: 1000
        templateId:
          type: string
        variables:
          type: object

    BatchNotificationResponse:
      type: object
      properties:
        batchId:
          type: string
          format: uuid
        totalRecipients:
          type: integer
        status:
          type: string
          enum: [queued, processing, completed]

    CreateTemplateRequest:
      type: object
      required: [id, channel, body]
      properties:
        id:
          type: string
        channel:
          type: string
          enum: [email, sms, push]
        subject:
          type: string
        body:
          type: string
        variables:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
              required:
                type: boolean

    Template:
      type: object
      properties:
        id:
          type: string
        channel:
          type: string
        subject:
          type: string
        body:
          type: string
        createdAt:
          type: string
          format: date-time

  responses:
    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              details:
                type: array
                items:
                  type: string
    NotFound:
      description: Resource not found
    RateLimited:
      description: Too many requests
      headers:
        Retry-After:
          schema:
            type: integer
```

## Step 3: Generate Infrastructure-as-Code Templates

Use agent mode to create Terraform modules for the service:

```
@workspace In agent mode, create Terraform modules to deploy the Notification Service on AWS.
Include: ECS Fargate service, RDS PostgreSQL, ElastiCache Redis, SQS queues for
notification channels, CloudWatch monitoring, and an ALB with health checks.
```

**Generated Terraform (main module):**

```hcl
# infrastructure/main.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "environment" {
  type    = string
  default = "staging"
}

variable "service_name" {
  type    = string
  default = "notification-service"
}

locals {
  name_prefix = "${var.service_name}-${var.environment}"
  common_tags = {
    Service     = var.service_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = local.name_prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = local.name_prefix
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = var.service_name
    image = "${aws_ecr_repository.app.repository_url}:latest"
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "DATABASE_URL", value = "postgresql://${aws_db_instance.main.endpoint}/notifications" },
      { name = "REDIS_URL", value = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:6379" },
      { name = "SQS_EMAIL_QUEUE", value = aws_sqs_queue.email.url },
      { name = "SQS_SMS_QUEUE", value = aws_sqs_queue.sms.url },
      { name = "SQS_PUSH_QUEUE", value = aws_sqs_queue.push.url },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = local.common_tags
}

# SQS Queues for notification channels
resource "aws_sqs_queue" "email" {
  name                       = "${local.name_prefix}-email"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_dlq.arn
    maxReceiveCount     = 3
  })
  tags = local.common_tags
}

resource "aws_sqs_queue" "email_dlq" {
  name                      = "${local.name_prefix}-email-dlq"
  message_retention_seconds = 604800
  tags                      = local.common_tags
}

resource "aws_sqs_queue" "sms" {
  name                       = "${local.name_prefix}-sms"
  visibility_timeout_seconds = 30
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.sms_dlq.arn
    maxReceiveCount     = 3
  })
  tags = local.common_tags
}

resource "aws_sqs_queue" "sms_dlq" {
  name = "${local.name_prefix}-sms-dlq"
  tags = local.common_tags
}

resource "aws_sqs_queue" "push" {
  name                       = "${local.name_prefix}-push"
  visibility_timeout_seconds = 30
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.push_dlq.arn
    maxReceiveCount     = 3
  })
  tags = local.common_tags
}

resource "aws_sqs_queue" "push_dlq" {
  name = "${local.name_prefix}-push-dlq"
  tags = local.common_tags
}

# RDS PostgreSQL
resource "aws_db_instance" "main" {
  identifier     = local.name_prefix
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true

  db_name  = "notifications"
  username = "app"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  skip_final_snapshot     = var.environment != "production"

  tags = local.common_tags
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "main" {
  cluster_id           = local.name_prefix
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  security_group_ids   = [aws_security_group.redis.id]
  subnet_group_name    = aws_elasticache_subnet_group.main.name

  tags = local.common_tags
}

# CloudWatch Monitoring
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = 30
  tags              = local.common_tags
}

data "aws_region" "current" {}

variable "db_password" {
  type      = string
  sensitive = true
}
```

## Step 4: API Gateway Patterns

Use Copilot to design the API gateway configuration:

```
@workspace Generate a Kong API Gateway configuration for routing requests to
the Notification Service. Include rate limiting, JWT authentication,
request transformation, and circuit breaker patterns.
```

**Generated Kong configuration:**

```yaml
# kong/kong.yml
_format_version: "3.0"

services:
  - name: notification-service
    url: http://notification-service:3000
    retries: 3
    connect_timeout: 5000
    read_timeout: 30000
    write_timeout: 30000

    routes:
      - name: notification-api
        paths:
          - /api/v1/notifications
        methods:
          - GET
          - POST
        strip_path: false

      - name: template-api
        paths:
          - /api/v1/templates
        methods:
          - GET
          - POST
          - PUT
          - DELETE
        strip_path: false

    plugins:
      - name: jwt
        config:
          claims_to_verify:
            - exp
          key_claim_name: iss

      - name: rate-limiting
        config:
          minute: 100
          hour: 5000
          policy: redis
          redis_host: redis
          redis_port: 6379

      - name: request-transformer
        config:
          add:
            headers:
              - "X-Request-ID:$(uuid)"
              - "X-Forwarded-Service:notification"

      - name: circuit-breaker
        config:
          error_threshold: 50
          window_size: 60
          half_open_timeout: 30
          volume_threshold: 10
```

## Step 5: Event-Driven Architecture Scaffolding

Design the asynchronous messaging layer:

```
@workspace In agent mode, create the RabbitMQ consumer and publisher modules for
the Notification Service. Include dead-letter handling, retry with exponential
backoff, and message schemas.
```

**Generated message consumer:**

```typescript
// src/infrastructure/messaging/rabbitmq-consumer.ts
import amqplib, { Channel, ConsumeMessage } from 'amqplib';

interface NotificationMessage {
  id: string;
  channel: 'email' | 'sms' | 'push';
  recipient: string;
  templateId: string;
  variables: Record<string, string>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  attempt: number;
  maxRetries: number;
}

const EXCHANGE = 'notifications';
const RETRY_DELAYS = [5000, 15000, 60000]; // 5s, 15s, 60s

export class NotificationConsumer {
  private channel!: Channel;

  async connect(url: string): Promise<void> {
    const connection = await amqplib.connect(url);
    this.channel = await connection.createChannel();
    await this.channel.prefetch(10);

    // Set up exchanges and queues
    await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await this.channel.assertExchange(`${EXCHANGE}.retry`, 'topic', { durable: true });
    await this.channel.assertExchange(`${EXCHANGE}.dlx`, 'topic', { durable: true });

    for (const type of ['email', 'sms', 'push']) {
      // Main queue
      await this.channel.assertQueue(`${EXCHANGE}.${type}`, {
        durable: true,
        deadLetterExchange: `${EXCHANGE}.dlx`,
        deadLetterRoutingKey: type,
      });
      await this.channel.bindQueue(`${EXCHANGE}.${type}`, EXCHANGE, type);

      // Retry queue with TTL
      await this.channel.assertQueue(`${EXCHANGE}.${type}.retry`, {
        durable: true,
        deadLetterExchange: EXCHANGE,
        deadLetterRoutingKey: type,
      });
      await this.channel.bindQueue(
        `${EXCHANGE}.${type}.retry`, `${EXCHANGE}.retry`, type
      );

      // Dead-letter queue
      await this.channel.assertQueue(`${EXCHANGE}.${type}.dlq`, { durable: true });
      await this.channel.bindQueue(
        `${EXCHANGE}.${type}.dlq`, `${EXCHANGE}.dlx`, type
      );
    }
  }

  async consume(
    type: string,
    handler: (msg: NotificationMessage) => Promise<void>,
  ): Promise<void> {
    await this.channel.consume(`${EXCHANGE}.${type}`, async (msg) => {
      if (!msg) return;

      try {
        const notification: NotificationMessage = JSON.parse(msg.content.toString());
        await handler(notification);
        this.channel.ack(msg);
      } catch (error) {
        await this.handleFailure(msg, type, error as Error);
      }
    });
  }

  private async handleFailure(
    msg: ConsumeMessage,
    type: string,
    error: Error,
  ): Promise<void> {
    const content: NotificationMessage = JSON.parse(msg.content.toString());
    const attempt = content.attempt ?? 0;

    if (attempt < content.maxRetries) {
      const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
      console.warn(`Retrying ${content.id} in ${delay}ms (attempt ${attempt + 1})`);

      this.channel.publish(
        `${EXCHANGE}.retry`,
        type,
        Buffer.from(JSON.stringify({ ...content, attempt: attempt + 1 })),
        { expiration: delay.toString() },
      );
      this.channel.ack(msg);
    } else {
      console.error(`Failed permanently: ${content.id} — ${error.message}`);
      this.channel.nack(msg, false, false); // Send to DLQ
    }
  }
}
```

## 🎯 Hands-On: Design a Multi-Region Deployment

Using Copilot agent mode, extend your Notification Service for multi-region deployment:

1. **Generate a Terraform module** for multi-region ECS with Route 53 failover
2. **Design the data replication strategy** — ask Copilot to compare Aurora Global Database vs application-level replication
3. **Create a Mermaid diagram** showing the multi-region architecture with failover paths
4. **Write an ADR** documenting the multi-region strategy and its trade-offs

```
@workspace In agent mode, extend the Notification Service Terraform to support
multi-region deployment in us-east-1 and eu-west-1. Include Route 53 health
checks, Aurora Global Database for cross-region replication, and SQS
message fan-out for region-local processing.
```

## 🎯 What You Learned

- Scaffolding complete project structures with Copilot agent mode
- Generating OpenAPI specifications from requirements
- Creating Terraform infrastructure-as-code from architecture descriptions
- Configuring API gateway patterns (rate limiting, auth, circuit breakers)
- Designing event-driven messaging with retry and dead-letter handling

## 📚 Glossary

- **Agent Mode**: Copilot mode that can create/edit multiple files and run commands
- **OpenAPI**: A specification standard for describing RESTful APIs
- **Terraform**: Infrastructure-as-code tool by HashiCorp
- **Circuit Breaker**: A pattern that prevents cascading failures in distributed systems
- **Dead-Letter Queue**: A queue that stores messages that couldn't be processed successfully

## ➡️ Next Steps

Ready to build a complete developer platform? Continue to:
- 🔴 [Platform Engineering with Agentic Copilot](/Learn-GHCP/courses/persona/architect-advanced/)
