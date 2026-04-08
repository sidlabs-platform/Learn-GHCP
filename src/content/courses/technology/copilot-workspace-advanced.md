---
title: "Copilot Workspace for Architecture Changes"
description: "Use Copilot Workspace for large-scale refactoring, architecture migrations, and cross-repository changes."
track: "technology"
difficulty: "advanced"
featureRefs:
  - copilot-agents
  - agent-mode
  - copilot-code-review
personaTags:
  - architect
  - developer
technologyTags:
  - github
  - copilot-workspace
  - architecture
prerequisites:
  - copilot-workspace-intermediate
estimatedMinutes: 60
lastGenerated: 2026-04-08
published: true
---

# 🔴 Copilot Workspace for Architecture Changes

You've mastered multi-file features in Workspace. Now it's time to tackle the hardest class of changes — large-scale refactoring, architecture migrations, and cross-repository coordination. This course teaches you strategies for using Copilot Workspace on changes that span dozens of files and reshape your system's structure.

## Prerequisites

- Completed **Copilot Workspace: Complex Multi-File Changes** (intermediate course)
- Experience with at least one major refactoring (e.g., database migration, API versioning, module extraction)
- Familiarity with architectural patterns (monolith, microservices, hexagonal/clean architecture)
- A codebase with meaningful complexity (50+ source files)

## Large Refactoring Strategies

Architecture changes are fundamentally different from feature additions. They touch many files, require preserving existing behavior, and must be done incrementally to avoid breaking the system.

### The Strangler Fig Pattern with Workspace

The strangler fig pattern — gradually replacing old code with new code — maps perfectly to Workspace sessions:

```
┌──────────────────────────────────────────────┐
│              Existing Monolith               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Module A  │  │ Module B  │  │ Module C  │   │
│  │ (legacy)  │  │ (legacy)  │  │ (legacy)  │   │
│  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────────────────────────┘

         Session 1          Session 2          Session 3
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │ Extract A's  │   │ Route traffic│   │ Remove old   │
    │ interface    │   │ to new A     │   │ Module A     │
    └──────────────┘   └──────────────┘   └──────────────┘
```

**Session 1 — Extract the interface:**

```markdown
Issue: Extract OrderService interface from monolith

## Context
OrderService in src/services/orderService.ts directly accesses the database,
sends emails, and calls payment APIs. We need to extract a clean interface
so we can replace the implementation without changing callers.

## Plan
1. Create IOrderService interface in src/domain/interfaces/orderService.ts
2. Update OrderService to implement IOrderService
3. Update all imports across the codebase to reference IOrderService
4. No behavior changes — all existing tests must continue to pass
```

**Session 2 — Create the new implementation:**

```markdown
Issue: Create new OrderService with clean architecture

## Context
IOrderService interface is defined. Create a new implementation following
hexagonal architecture with dependency injection.

## Plan
1. Create new OrderServiceImpl in src/application/orderService.ts
2. Inject IOrderRepository, IPaymentGateway, IEmailSender via constructor
3. Add feature flag to toggle between old and new implementation
4. Add integration tests for the new implementation
```

**Session 3 — Remove the legacy code:**

```markdown
Issue: Remove legacy OrderService after migration validation

## Context
New OrderServiceImpl has been in production for 2 weeks with no issues.
Remove the old implementation and the feature flag.

## Plan
1. Remove src/services/orderService.ts (old implementation)
2. Remove the feature flag check in src/config/featureFlags.ts
3. Rename OrderServiceImpl → OrderService
4. Update remaining imports
5. Remove legacy tests that are now redundant
```

### Phased Workspace Sessions

For large refactors, never try to do everything in one Workspace session. Break it into phases:

| Phase | Scope | Risk Level | Validation |
|-------|-------|-----------|-----------|
| 1. Interface extraction | Types and interfaces only | Very Low | All tests pass unchanged |
| 2. New implementation | New files alongside old | Low | New tests + old tests pass |
| 3. Traffic switching | Configuration change | Medium | Canary deployment, monitoring |
| 4. Cleanup | Remove old code | Low | All tests still pass |

Each phase is a separate Workspace session, producing a separate PR that can be reviewed and merged independently.

## Database Migration Planning

Database schema changes are high-risk because they affect data integrity. Workspace can help plan these carefully.

### Example: Normalize an Addresses Table

**Issue:**

```markdown
Title: Normalize customer addresses into a separate table

## Current State
Customer addresses are stored as JSON in the `customers.address` column.
This makes it impossible to query by city/state or enforce address validation.

## Target State
- New `addresses` table with structured columns
- Customers link to addresses via foreign key
- Support multiple addresses per customer (shipping, billing)
- Backward-compatible: existing API responses unchanged

## Migration Constraints
- Zero-downtime migration (no table locks during business hours)
- Must handle ~2M customer records
- Preserve all existing address data
```

**Workspace plan for safe migration:**

```
Plan (Phase 1 — Schema + Dual Write):
├── CREATE  prisma/migrations/20260408_create_addresses/migration.sql
│   └── CREATE TABLE addresses (
│         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
│         customer_id UUID NOT NULL REFERENCES customers(id),
│         type VARCHAR(20) NOT NULL DEFAULT 'shipping',
│         street TEXT NOT NULL,
│         city VARCHAR(100) NOT NULL,
│         state VARCHAR(50) NOT NULL,
│         postal_code VARCHAR(20) NOT NULL,
│         country VARCHAR(2) NOT NULL DEFAULT 'US',
│         created_at TIMESTAMPTZ DEFAULT NOW()
│       );
│
├── MODIFY  prisma/schema.prisma
│   └── Add Address model with Customer relation
│
├── CREATE  src/services/addressMigrationService.ts
│   └── Batch migration: read JSON from customers, insert into addresses
│       Process in batches of 1000 to avoid memory issues
│
├── MODIFY  src/services/customerService.ts
│   └── Dual-write: when a customer updates address, write to both
│       JSON column AND addresses table during migration period
│
├── CREATE  scripts/migrate-addresses.ts
│   └── CLI script to run the batch migration with progress logging
│       Usage: npx tsx scripts/migrate-addresses.ts --batch-size 1000
│
└── CREATE  tests/services/addressMigrationService.test.ts
    └── Test batch processing, JSON parsing edge cases,
        duplicate handling, and progress tracking
```

**Generated migration script:**

```typescript
// scripts/migrate-addresses.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "1000");

interface LegacyAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

async function migrateAddresses() {
  const totalCustomers = await prisma.customer.count({
    where: { address: { not: null } },
  });
  console.log(`Migrating addresses for ${totalCustomers} customers...`);

  let processed = 0;
  let cursor: string | undefined;

  while (processed < totalCustomers) {
    const customers = await prisma.customer.findMany({
      where: { address: { not: null } },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });

    if (customers.length === 0) break;

    const addressInserts = customers
      .map((customer) => {
        const legacy = customer.address as unknown as LegacyAddress;
        if (!legacy || !legacy.street) return null;

        return {
          customerId: customer.id,
          type: "shipping" as const,
          street: legacy.street || "Unknown",
          city: legacy.city || "Unknown",
          state: legacy.state || "Unknown",
          postalCode: legacy.zip || "00000",
          country: legacy.country || "US",
        };
      })
      .filter(Boolean);

    await prisma.address.createMany({
      data: addressInserts as any[],
      skipDuplicates: true,
    });

    cursor = customers[customers.length - 1].id;
    processed += customers.length;
    const pct = ((processed / totalCustomers) * 100).toFixed(1);
    console.log(`Progress: ${processed}/${totalCustomers} (${pct}%)`);
  }

  console.log("Migration complete!");
}

migrateAddresses()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## API Versioning with Workspace

When your API needs breaking changes, Workspace can help plan the versioning strategy.

### Strategy: URL-Based Versioning

**Issue:**

```markdown
Title: Version the REST API to v2 with breaking changes to user endpoints

## Breaking Changes in v2
- User response: `fullName` split into `firstName` and `lastName`
- Pagination: offset-based → cursor-based
- Auth: API key → OAuth 2.0 Bearer tokens
- Error format: `{ error: string }` → `{ code: string, message: string, details: [] }`

## Requirements
- v1 continues to work for 6 months (deprecation period)
- v2 is the default for new integrations
- Shared business logic between v1 and v2 (no duplication)
```

**Workspace plan:**

```
Plan:
├── CREATE  src/infrastructure/http/v2/routes/userRoutes.ts
│   └── v2 user routes with new response format and cursor pagination
│
├── CREATE  src/infrastructure/http/v2/middleware/auth.ts
│   └── OAuth 2.0 Bearer token validation middleware
│
├── CREATE  src/infrastructure/http/v2/middleware/errorHandler.ts
│   └── New error format: { code, message, details }
│
├── CREATE  src/infrastructure/http/v2/serializers/userSerializer.ts
│   └── Transform domain User → v2 API response (firstName, lastName)
│
├── MODIFY  src/infrastructure/http/v1/serializers/userSerializer.ts
│   └── Keep existing fullName format for backward compatibility
│
├── MODIFY  src/infrastructure/http/router.ts
│   └── Mount v1 routes at /api/v1/* and v2 routes at /api/v2/*
│       Add deprecation header to v1 responses
│
├── CREATE  src/infrastructure/http/middleware/deprecation.ts
│   └── Add 'Deprecation' and 'Sunset' headers to v1 responses
│       Sunset date: 6 months from deployment
│
└── CREATE  tests/integration/v2/userRoutes.test.ts
    └── Test new response format, cursor pagination, OAuth auth,
        error format, and verify v1 still works unchanged
```

**Key pattern — Shared service layer:**

```typescript
// src/application/userService.ts — Shared between v1 and v2
export class UserService {
  async getUser(id: string): Promise<DomainUser> {
    // Business logic stays the same regardless of API version
    return this.userRepository.findById(id);
  }

  async listUsers(cursor?: string, limit?: number): Promise<PaginatedResult<DomainUser>> {
    // Supports both offset (v1) and cursor (v2) internally
    return this.userRepository.findMany({ cursor, limit: limit || 20 });
  }
}

// src/infrastructure/http/v1/serializers/userSerializer.ts
export function serializeUserV1(user: DomainUser) {
  return {
    id: user.id,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
  };
}

// src/infrastructure/http/v2/serializers/userSerializer.ts
export function serializeUserV2(user: DomainUser) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
```

## Cross-Repository Coordination

Some architecture changes span multiple repositories. Workspace sessions can be coordinated across repos.

### Strategy: Interface Repository Pattern

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ shared-types     │     │ order-service    │     │ payment-service │
│ (npm package)    │◄────│ (consumer)       │     │ (consumer)      │
│                  │     │                  │     │                  │
│ Session 1:       │     │ Session 2:       │     │ Session 3:       │
│ Define new types │     │ Consume types    │     │ Consume types    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Session 1 — shared-types repo:**

```markdown
Issue: Add OrderCancellationEvent to shared types package

## Plan
1. Add OrderCancellationEvent interface
2. Add CancellationReason enum
3. Bump package version to 2.4.0
4. Update CHANGELOG.md
```

**Session 2 — order-service repo:**

```markdown
Issue: Publish OrderCancellationEvent when orders are cancelled

## Context
shared-types@2.4.0 includes OrderCancellationEvent.
Update package.json to use the new version and implement the event publisher.
```

**Session 3 — payment-service repo:**

```markdown
Issue: Subscribe to OrderCancellationEvent for automatic refunds

## Context
shared-types@2.4.0 includes OrderCancellationEvent.
Add an event handler that processes cancellations and initiates refunds.
```

### Coordination Checklist

When running cross-repo Workspace sessions:

- [ ] Define shared contracts first (types, schemas, events)
- [ ] Publish shared packages before consuming sessions
- [ ] Use consistent version pinning across repos
- [ ] Create a tracking issue in a central repo linking all PRs
- [ ] Merge in dependency order: shared → producers → consumers

## Review Integration

For architecture changes, code review is critical. Leverage Copilot code review alongside Workspace.

### Setting Up Copilot Code Review

1. Enable Copilot code review in **Repository Settings → Code Review**
2. Copilot automatically reviews PRs generated by Workspace
3. Review comments follow the patterns in `.github/copilot-instructions.md`

### What Copilot Reviews in Architecture PRs

| Check | What It Looks For |
|-------|-------------------|
| **Import consistency** | Are all imports using the new module paths? |
| **Dead code** | Are old implementations fully removed? |
| **Type safety** | Do new interfaces match their implementations? |
| **Test coverage** | Are new code paths tested? |
| **Breaking changes** | Are backward-compatible wrappers in place? |

### Human Review Focus Areas

Copilot handles mechanical checks. Focus your human review on:

- **Design decisions** — Is this the right architectural approach?
- **Data integrity** — Are migrations safe for production data?
- **Performance** — Will the new structure handle current load?
- **Operational impact** — Can we roll back if something goes wrong?

## Capstone: Migrate a Monolith Module to a Microservice

This capstone project takes you through a complete architecture migration using Workspace.

### The Scenario

Your e-commerce monolith has a `notifications` module that has become a bottleneck. You need to extract it into a standalone microservice.

```
BEFORE (Monolith):
src/
├── services/
│   ├── orderService.ts      (imports notificationService directly)
│   ├── notificationService.ts (sends emails, push, SMS)
│   └── userService.ts        (imports notificationService directly)
├── templates/
│   └── emails/               (notification templates)
└── queues/
    └── notificationQueue.ts  (in-process queue)

AFTER (Extracted Microservice):
monolith/src/
├── services/
│   ├── orderService.ts      (publishes events to message broker)
│   └── userService.ts       (publishes events to message broker)
├── events/
│   └── publishers/
│       └── notificationPublisher.ts  (publishes to RabbitMQ)
└── infrastructure/
    └── messageBroker.ts      (RabbitMQ connection)

notification-service/
├── src/
│   ├── handlers/
│   │   └── notificationHandler.ts  (subscribes to events)
│   ├── services/
│   │   └── notificationService.ts  (sends emails, push, SMS)
│   ├── templates/
│   │   └── emails/
│   └── infrastructure/
│       └── messageBroker.ts
├── Dockerfile
└── docker-compose.yml
```

### Phase 1 — Define the Event Contract (Workspace Session)

```markdown
Issue: Define notification event contracts for service extraction

## Plan
1. CREATE src/events/schemas/notificationEvent.ts
   - NotificationRequestedEvent with type, recipient, channel, template, data
2. CREATE src/events/schemas/notificationSentEvent.ts
   - NotificationSentEvent with id, status, sentAt, error
3. CREATE tests/events/schemas/notificationEvent.test.ts
   - Validation tests for event schema
```

### Phase 2 — Add Event Publishing to Monolith (Workspace Session)

```markdown
Issue: Replace direct notificationService calls with event publishing

## Plan
1. CREATE src/infrastructure/messageBroker.ts
   - RabbitMQ connection with reconnection logic
2. CREATE src/events/publishers/notificationPublisher.ts
   - Publish NotificationRequestedEvent to 'notifications' exchange
3. MODIFY src/services/orderService.ts
   - Replace notificationService.sendOrderConfirmation() with event publish
4. MODIFY src/services/userService.ts
   - Replace notificationService.sendWelcomeEmail() with event publish
5. Feature flag: NOTIFICATION_MODE=direct|event (gradual rollout)
```

### Phase 3 — Create the Microservice (Workspace Session)

```markdown
Issue: Create standalone notification microservice

## Plan
1. Initialize new repository with Express + TypeScript
2. CREATE src/handlers/notificationHandler.ts
   - Subscribe to NotificationRequestedEvent
   - Route to appropriate channel (email, push, SMS)
3. Migrate templates from monolith
4. CREATE Dockerfile and docker-compose.yml
5. CREATE health check endpoint
6. Integration tests with RabbitMQ test container
```

### Phase 4 — Cleanup Monolith (Workspace Session)

```markdown
Issue: Remove legacy notification code from monolith

## Prerequisites
- Notification microservice running in production for 2+ weeks
- Feature flag NOTIFICATION_MODE=event for all traffic
- No errors in notification delivery metrics

## Plan
1. DELETE src/services/notificationService.ts
2. DELETE src/templates/emails/ (moved to microservice)
3. DELETE src/queues/notificationQueue.ts
4. REMOVE feature flag from configuration
5. Update documentation and architecture diagrams
```

### Validation Checklist

After all 4 phases:

- [ ] All existing notification types still delivered correctly
- [ ] Monolith no longer has notification-sending code
- [ ] Microservice handles all notification channels
- [ ] Event schema is versioned and documented
- [ ] Monitoring/alerting configured for the new service
- [ ] Runbook written for notification service incidents
- [ ] Load tested at 2x current peak traffic

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Strangler fig pattern** | Incrementally replacing parts of a system by wrapping old functionality with new implementations |
| **Dual write** | Writing to both old and new data stores during a migration to ensure consistency |
| **Zero-downtime migration** | Database or service changes that don't require taking the system offline |
| **Event contract** | A versioned schema defining the structure of events exchanged between services |
| **Feature flag** | A configuration toggle that controls which code path is active, enabling gradual rollouts |
| **Cross-repo coordination** | Managing related changes across multiple repositories with dependency ordering |

## ➡️ Next Steps

You've completed the Copilot Workspace series! Explore related advanced courses:
- 🔴 [Copilot Chat at Scale: Team Patterns and Custom Extensions](/Learn-GHCP/courses/technology/copilot-chat-advanced/) — Build team-wide AI workflows
- 🔴 [Advanced Copilot Agents: Multi-Repo and CI Integration](/Learn-GHCP/courses/agents/copilot-agents-advanced/) — Orchestrate cloud agents for complex pipelines
