---
title: "Copilot Workspace: Complex Multi-File Changes"
description: "Handle complex feature implementations across multiple files using Copilot Workspace's planning and iteration capabilities."
track: "technology"
difficulty: "intermediate"
featureRefs:
  - copilot-agents
  - agent-mode
personaTags:
  - developer
technologyTags:
  - github
  - copilot-workspace
prerequisites:
  - copilot-workspace-beginner
estimatedMinutes: 40
lastGenerated: 2026-04-08
published: true
---

# 🟡 Copilot Workspace: Complex Multi-File Changes

You've learned the basics of Copilot Workspace — now it's time to tackle complex, multi-file feature implementations. This course covers iteration strategies, dependency management, combining Workspace with agent mode, and testing within Workspace sessions.

## Prerequisites

- Completed **Getting Started with Copilot Workspace** (beginner course)
- A repository with multiple source files, tests, and configuration
- Familiarity with at least one full-stack web framework (e.g., Express + React, Django + Vue)

## Multi-File Change Strategies

Real features rarely touch a single file. A typical feature might require changes to routes, services, database models, UI components, tests, and configuration. Workspace excels here because it sees the whole picture.

### Strategy 1: Layer-by-Layer Planning

Structure your issue and plan edits to follow architectural layers:

```
Layer 1: Data Model     → schema/migration, types/interfaces
Layer 2: Data Access    → repository, database queries
Layer 3: Business Logic → service functions, validation
Layer 4: API Layer      → routes, controllers, middleware
Layer 5: UI Layer       → components, pages, styles
Layer 6: Tests          → unit tests, integration tests
Layer 7: Configuration  → env vars, feature flags
```

**Why this matters:** When you structure the plan this way, each layer builds on the previous one. Workspace generates more coherent code because the types and interfaces from Layer 1 inform the implementation of Layers 2–6.

**Example issue:**

```markdown
Title: Add order cancellation feature

## Description
Allow customers to cancel orders within 30 minutes of placement.

## Requirements
- New `cancelled` order status in the database
- API endpoint: POST /api/orders/:id/cancel
- Validation: only orders placed < 30 min ago, not already shipped
- Send cancellation email to the customer
- Update the order dashboard UI with a cancel button
- Refund the payment (call Payments API)
```

**Plan structured by layers:**

```
Plan:
├── MODIFY  prisma/schema.prisma
│   └── Add 'CANCELLED' to OrderStatus enum
│
├── CREATE  prisma/migrations/20260408_add_cancelled_status/migration.sql
│   └── ALTER TYPE order_status ADD VALUE 'CANCELLED'
│
├── MODIFY  src/domain/order.ts
│   └── Add canCancel() method: checks status and 30-min window
│
├── MODIFY  src/services/orderService.ts
│   └── Add cancelOrder() method with validation, status update,
│       email notification, and payment refund
│
├── CREATE  src/routes/orderCancellation.ts
│   └── POST /api/orders/:id/cancel route handler with auth middleware
│
├── MODIFY  src/components/OrderDashboard.tsx
│   └── Add Cancel button (conditional on canCancel logic)
│
├── CREATE  tests/services/orderService.cancel.test.ts
│   └── Unit tests: within window, past window, already shipped,
│       already cancelled, payment refund failure
│
└── CREATE  tests/routes/orderCancellation.integration.test.ts
    └── Integration tests: auth required, success path, error paths
```

### Strategy 2: Contract-First for API Changes

When your feature involves API changes, define the contract first:

1. **Start with the API specification** — Have Workspace create or update an OpenAPI spec
2. **Generate types from the spec** — Types ensure all layers agree on data shapes
3. **Implement backend** — Routes and services matching the spec
4. **Implement frontend** — Components consuming the API per the spec

**Example brainstorm edit:**

```
Start by defining the API contract in src/api/openapi.yaml for the
cancellation endpoint. Generate TypeScript types from the spec.
Then implement backend and frontend using those types.
```

### Strategy 3: Test-First Planning

Tell Workspace to generate tests before implementation:

```
Plan order:
1. Write the test files first (unit + integration)
2. Then implement the code to make the tests pass

This ensures the implementation is driven by clear expectations.
```

Edit the plan to reorder test files above implementation files.

## Iterating on Plans

Plans rarely come out perfect on the first try. Here's how to iterate effectively.

### Adding Missing Files

After reviewing the initial plan, you might notice Workspace missed a file. For the order cancellation feature:

```
Missing: The email template for cancellation notifications.
Add: CREATE src/emails/templates/orderCancelled.html
```

Click **Add file** in the plan view, specify the path, and describe the change.

### Refining Change Descriptions

Vague descriptions produce vague code. Compare:

```
❌ "Update the order service"
✅ "Add cancelOrder(orderId, userId) method that:
    1. Fetches the order and verifies ownership
    2. Checks canCancel() — throws OrderNotCancellableError if false
    3. Updates status to CANCELLED in a transaction
    4. Calls PaymentService.refund(order.paymentId)
    5. Calls EmailService.send('orderCancelled', order.customer.email, { order })
    6. Returns the updated order"
```

The more specific your plan descriptions, the better the generated code.

### Splitting Large Plans

If a plan has more than 10 files, consider splitting it into phases:

**Phase 1 — Backend:**
- Database schema, domain logic, service, and API route
- Backend tests

**Phase 2 — Frontend:**
- UI components, pages, and styles
- Frontend tests

Create separate Workspace sessions for each phase, linking them to the same issue or to sub-issues.

## Handling Dependencies Between Files

When files depend on each other, Workspace needs to understand the dependency graph to generate correct imports and type references.

### Explicit Dependency Hints

Add dependency information to your plan descriptions:

```
CREATE src/domain/cancellation.ts
└── Define CancellationPolicy class.
    Dependencies: imports OrderStatus from src/domain/order.ts

MODIFY src/services/orderService.ts
└── Add cancelOrder() method.
    Dependencies:
    - CancellationPolicy from src/domain/cancellation.ts
    - PaymentService from src/services/paymentService.ts
    - EmailService from src/services/emailService.ts
```

### Import Chain Verification

After implementation, verify the import chain is correct:

```
src/routes/orderCancellation.ts
  └── imports OrderService from src/services/orderService.ts
        └── imports CancellationPolicy from src/domain/cancellation.ts
              └── imports OrderStatus from src/domain/order.ts
        └── imports PaymentService from src/services/paymentService.ts
        └── imports EmailService from src/services/emailService.ts
```

If Workspace generates incorrect imports, edit the code directly in the diff view or regenerate specific files.

## Workspace + Agent Mode Combination

For maximum productivity, combine Workspace's planning with VS Code agent mode's execution:

### Workflow: Plan in Workspace, Polish in Agent Mode

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ 1. Workspace     │────▶│ 2. Create PR     │────▶│ 3. Agent Mode   │
│ Plan + Implement │     │ (draft)          │     │ Polish + Fix    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

1. **Workspace** — Generate the initial multi-file implementation from the issue
2. **Create a draft PR** — Push the Workspace changes as a draft
3. **Open in VS Code** — Clone the branch locally
4. **Agent Mode** — Use `Ctrl+Shift+I` to ask Copilot to refine:
   ```
   Review the changes from the recent Workspace session.
   Fix any TypeScript errors, add missing error handling,
   and ensure all tests pass.
   ```

Agent mode can run the tests, see the failures, and iterate until everything passes — something Workspace alone can't do interactively.

### Workflow: Workspace for Structure, Chat for Details

1. **Workspace** — Generate the overall file structure and boilerplate
2. **Chat** — Ask detailed questions about specific implementation choices:
   ```
   @workspace Should cancellation use an optimistic lock on the order
   to prevent race conditions? Show me how the existing codebase
   handles concurrent updates.
   ```
3. **Inline Chat** — Make targeted fixes in specific files:
   ```
   Add optimistic locking using a version column to this update query
   ```

## Testing in Workspace

Workspace can generate tests as part of the plan, but you need to guide it for quality.

### Specifying Test Scenarios

Instead of just saying "add tests," be explicit about scenarios:

```
CREATE tests/services/orderService.cancel.test.ts
└── Unit tests for cancelOrder():
    1. Successfully cancels an order placed 10 minutes ago
    2. Rejects cancellation of an order placed 45 minutes ago (past 30-min window)
    3. Rejects cancellation of an already-shipped order
    4. Rejects cancellation of an already-cancelled order
    5. Handles payment refund failure gracefully (logs error, still cancels)
    6. Sends cancellation email after successful cancellation
    7. Rolls back status change if payment refund throws
    8. Returns 403 if user doesn't own the order
```

**Example generated test:**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "../../src/services/orderService";
import { OrderRepository } from "../../src/repositories/orderRepository";
import { PaymentService } from "../../src/services/paymentService";
import { EmailService } from "../../src/services/emailService";

describe("OrderService.cancelOrder", () => {
  let orderService: OrderService;
  let mockOrderRepo: jest.Mocked<OrderRepository>;
  let mockPaymentService: jest.Mocked<PaymentService>;
  let mockEmailService: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockOrderRepo = {
      findById: vi.fn(),
      updateStatus: vi.fn(),
    } as any;
    mockPaymentService = { refund: vi.fn() } as any;
    mockEmailService = { send: vi.fn() } as any;
    orderService = new OrderService(
      mockOrderRepo,
      mockPaymentService,
      mockEmailService
    );
  });

  it("cancels an order placed within the 30-minute window", async () => {
    const order = createOrder({
      status: "CONFIRMED",
      placedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
    });
    mockOrderRepo.findById.mockResolvedValue(order);
    mockPaymentService.refund.mockResolvedValue({ success: true });

    const result = await orderService.cancelOrder(order.id, order.userId);

    expect(result.status).toBe("CANCELLED");
    expect(mockPaymentService.refund).toHaveBeenCalledWith(order.paymentId);
    expect(mockEmailService.send).toHaveBeenCalledWith(
      "orderCancelled",
      order.customerEmail,
      expect.objectContaining({ orderId: order.id })
    );
  });

  it("rejects cancellation past the 30-minute window", async () => {
    const order = createOrder({
      status: "CONFIRMED",
      placedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
    });
    mockOrderRepo.findById.mockResolvedValue(order);

    await expect(
      orderService.cancelOrder(order.id, order.userId)
    ).rejects.toThrow("Order can no longer be cancelled");
  });

  it("rejects cancellation of a shipped order", async () => {
    const order = createOrder({ status: "SHIPPED" });
    mockOrderRepo.findById.mockResolvedValue(order);

    await expect(
      orderService.cancelOrder(order.id, order.userId)
    ).rejects.toThrow("Order can no longer be cancelled");
  });

  it("handles payment refund failure gracefully", async () => {
    const order = createOrder({
      status: "CONFIRMED",
      placedAt: new Date(Date.now() - 5 * 60 * 1000),
    });
    mockOrderRepo.findById.mockResolvedValue(order);
    mockPaymentService.refund.mockRejectedValue(new Error("Payment gateway down"));

    const result = await orderService.cancelOrder(order.id, order.userId);

    expect(result.status).toBe("CANCELLED");
    expect(result.refundStatus).toBe("FAILED");
  });
});

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-123",
    userId: "user-456",
    status: "CONFIRMED",
    placedAt: new Date(),
    paymentId: "pay-789",
    customerEmail: "customer@example.com",
    ...overrides,
  };
}
```

## Real-World Scenario: Add a Feature Spanning 5+ Files

Let's walk through a complete complex scenario.

### Scenario: Add User Notification Preferences

**Issue:**

```markdown
Title: User notification preferences

## Description
Allow users to configure which notifications they receive
(email, in-app, push) for each event type (order updates,
promotions, security alerts).

## Requirements
- Preferences stored per-user in the database
- API: GET/PUT /api/users/:id/notification-preferences
- UI: Preferences page accessible from user settings
- Default: all notifications enabled for new users
- Changes take effect immediately (no restart required)
```

**Workspace plan (8 files):**

| # | Operation | File | Description |
|---|-----------|------|-------------|
| 1 | CREATE | `prisma/migrations/20260408_notification_prefs/migration.sql` | New `notification_preferences` table |
| 2 | MODIFY | `prisma/schema.prisma` | Add NotificationPreference model linked to User |
| 3 | CREATE | `src/domain/notificationPreference.ts` | Domain type with defaults and validation |
| 4 | CREATE | `src/services/notificationPreferenceService.ts` | Get, update, apply-defaults service |
| 5 | CREATE | `src/routes/notificationPreferences.ts` | GET and PUT routes with validation |
| 6 | CREATE | `src/components/NotificationPreferences.tsx` | React preferences grid with toggles |
| 7 | MODIFY | `src/pages/Settings.tsx` | Add Notifications tab linking to preferences |
| 8 | CREATE | `tests/services/notificationPreferenceService.test.ts` | Unit tests for all service methods |

**Review the implementation for each file, checking:**

1. **Migration** — Correct SQL syntax, foreign key to users table, default values
2. **Schema** — Prisma model matches migration, proper relations defined
3. **Domain** — Type-safe preference object, default factory function
4. **Service** — Handles missing preferences (creates defaults), validates input
5. **Routes** — Auth middleware applied, request validation with Zod
6. **Component** — Accessible toggle grid, loading/error states
7. **Settings page** — New tab correctly routed, lazy-loaded
8. **Tests** — Covers get-existing, get-default, update-valid, update-invalid

**Iteration example:**

After reviewing the implementation, you notice the component doesn't handle loading state. Edit the plan for `NotificationPreferences.tsx`:

```
Add: Show a skeleton loader while preferences are fetching.
Add: Show an error toast if the PUT request fails.
Add: Disable the save button while a request is in flight.
```

Regenerate that single file to get an improved implementation.

## Hands-On Exercise

### Task: Add Search Functionality

Create an issue in your repository:

```markdown
Title: Add full-text search to the products catalog

## Requirements
- Search endpoint: GET /api/products/search?q=term&page=1&limit=20
- PostgreSQL full-text search using tsvector
- Search across product name, description, and tags
- Ranked results with relevance scoring
- UI: Search bar on the catalog page with debounced input
- Highlight matching terms in results
```

1. **Open in Workspace** and review the brainstorm
2. **Edit the plan** to ensure it follows the layer-by-layer strategy
3. **Review the implementation** file by file
4. **Iterate** — refine at least 2 files by editing plan descriptions and regenerating
5. **Create the PR** and verify the diff looks correct

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Multi-file plan** | A Workspace plan that creates or modifies multiple files as a cohesive change set |
| **Plan iteration** | Editing the plan descriptions, adding/removing files, or reordering before regenerating code |
| **Dependency graph** | The chain of imports between files that Workspace must resolve correctly |
| **Contract-first** | Defining API specifications before implementing backend or frontend code |
| **Agent mode** | Copilot's autonomous editing mode in VS Code, complementary to Workspace for local refinement |

## ➡️ Next Steps

Ready for large-scale architecture changes? Continue to the advanced course:
- 🔴 [Copilot Workspace for Architecture Changes](/Learn-GHCP/courses/technology/copilot-workspace-advanced/)
