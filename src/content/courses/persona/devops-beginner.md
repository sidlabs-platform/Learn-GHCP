---
title: "Copilot for DevOps: AI-Assisted Infrastructure"
description: "Use Copilot to generate GitHub Actions workflows, Dockerfiles, and basic infrastructure configurations."
track: "persona"
difficulty: "beginner"
featureRefs:
  - code-completions
  - copilot-chat
personaTags:
  - devops
technologyTags:
  - github-actions
  - docker
  - yaml
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

# 🟢 Copilot for DevOps: AI-Assisted Infrastructure

Welcome! In this beginner course you'll learn how Copilot can supercharge your DevOps workflows — from generating GitHub Actions pipelines to writing Dockerfiles and troubleshooting CI failures.

## Prerequisites

- A GitHub account with an active Copilot subscription
- VS Code with the Copilot extension installed
- Basic familiarity with Git, Docker, and CI/CD concepts

## Step 1: Generating GitHub Actions Workflows

Copilot excels at YAML generation. Let's create a CI pipeline from scratch.

### Create a new workflow

Create `.github/workflows/ci.yml` and start with a descriptive comment:

```yaml
# CI pipeline that:
# - Triggers on push to main and pull requests
# - Runs on Ubuntu latest
# - Installs Node.js 20
# - Installs dependencies with npm ci
# - Runs linting, type checking, and tests
# - Uploads test coverage as an artifact
```

Pause after typing the comments — Copilot will generate the full workflow:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Run tests with coverage
        run: npm run test -- --coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7
```

> 💡 **Tip:** Copilot knows the latest versions of popular GitHub Actions. It will suggest `actions/checkout@v4` instead of outdated versions.

### Add a matrix strategy

Need to test across multiple Node.js versions? Add a comment:

```yaml
# Add a matrix strategy to test on Node.js 18, 20, and 22
```

Copilot will suggest:

```yaml
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

## Step 2: Writing Dockerfiles with Copilot

Create a `Dockerfile` and let Copilot build it from a comment:

```dockerfile
# Multi-stage Dockerfile for a Node.js TypeScript application
# Stage 1: Build the TypeScript project
# Stage 2: Production image with only compiled JS and production dependencies
# Use Node.js 20 Alpine for small image size
# Run as non-root user for security
```

Copilot generates:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

> 🔑 **Key insight:** Copilot understands Docker best practices like multi-stage builds, non-root users, and health checks. Add comments describing your security and performance requirements, and it will follow them.

## Step 3: Docker Compose for Local Development

Create `docker-compose.yml`:

```yaml
# Local development stack:
# - Node.js app with hot reload (mount source code)
# - PostgreSQL 16 database
# - Redis 7 cache
# - pgAdmin for database management
# Use a shared network and named volumes for persistence
```

Copilot generates the full compose file:

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: builder
    volumes:
      - ./src:/app/src
      - ./package.json:/app/package.json
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://app:secret@db:5432/myapp
      - REDIS_URL=redis://cache:6379
      - NODE_ENV=development
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    command: npm run dev

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d myapp"]
      interval: 5s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@local.dev
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "8080:80"
    depends_on:
      - db

volumes:
  pgdata:
  redisdata:
```

## Step 4: Basic Terraform with Copilot

Copilot understands Terraform's HCL syntax. Create `main.tf`:

```hcl
# AWS infrastructure:
# - VPC with public and private subnets in 2 AZs
# - Application Load Balancer in public subnets
# - ECS Fargate cluster in private subnets
# - RDS PostgreSQL in private subnets
# Use variables for environment name and instance sizes
```

Copilot will scaffold the resource blocks. Here's a snippet it might generate:

```hcl
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "myapp"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.app_name}-${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.app_name}-${var.environment}-public-${count.index + 1}"
  }
}
```

> 💡 **Tip:** Copilot generates consistent tag naming conventions and uses Terraform best practices like `cidrsubnet()` for subnet calculations.

## Step 5: Troubleshooting CI Failures with Chat

When a CI pipeline fails, paste the error output into Copilot Chat:

```
My GitHub Actions workflow failed with this error:

Error: Process completed with exit code 1.
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! Found: react@18.2.0
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^17.0.0" from react-beautiful-dnd@13.1.1

What's wrong and how do I fix it?
```

Copilot will explain the dependency conflict and suggest solutions:

```
The error indicates a peer dependency conflict. react-beautiful-dnd@13.1.1
requires React 17, but you have React 18 installed.

Options:
1. Use --legacy-peer-deps: npm ci --legacy-peer-deps
2. Switch to @hello-pangea/dnd (React 18 compatible fork)
3. Add an overrides field in package.json
```

### Debugging workflow syntax

```
Why does this step fail?

- name: Deploy
  if: github.ref == 'refs/heads/main'
  run: |
    echo "Deploying..."
    curl -X POST ${{ secrets.DEPLOY_WEBHOOK }}
```

Copilot can spot issues like missing quotes around expressions or incorrect context references.

## 🎯 Hands-On Exercise: Build a Complete CI/CD Starter

Create a full CI/CD setup for a Node.js project:

1. **`.github/workflows/ci.yml`** — Lint, test, and build on every PR
2. **`.github/workflows/deploy.yml`** — Deploy to staging on merge to `main`
3. **`Dockerfile`** — Multi-stage build for production
4. **`docker-compose.yml`** — Local development stack
5. **`.dockerignore`** — Exclude unnecessary files

Use Copilot for each file — write a descriptive comment header and let Copilot generate the configuration. Verify each file is syntactically valid:

```bash
# Validate GitHub Actions syntax
docker run --rm -v $(pwd):/repo -w /repo rhysd/actionlint

# Validate Dockerfile
docker build --check .

# Validate Compose
docker compose config --quiet
```

## 🎯 What You Learned

- Generating GitHub Actions workflows from descriptive comments
- Writing multi-stage Dockerfiles with security best practices
- Creating Docker Compose stacks for local development
- Basic Terraform resource generation with Copilot
- Troubleshooting CI/CD failures using Copilot Chat

## 📚 Glossary

- **GitHub Actions**: GitHub's built-in CI/CD platform
- **Multi-stage build**: A Docker technique using multiple `FROM` statements to keep production images small
- **Matrix strategy**: Running the same workflow across multiple configurations in parallel
- **HCL (HashiCorp Configuration Language)**: The language used by Terraform
- **Peer dependency**: A package dependency that must be installed by the consuming project

## ➡️ Next Steps

Ready to build real infrastructure? Continue to the intermediate course:
- 🟡 [Infrastructure as Code with Copilot](/Learn-GHCP/courses/persona/devops-intermediate/)
