---
title: "Design Pattern Migration with Copilot"
description: "Apply design patterns, migrate architectural styles, and modernize codebases using Copilot's multi-file understanding."
track: "technology"
difficulty: "intermediate"
featureRefs:
  - copilot-chat
  - agent-mode
  - inline-chat
personaTags:
  - developer
technologyTags:
  - refactoring
  - design-patterns
  - typescript
prerequisites:
  - refactoring-beginner
estimatedMinutes: 45
lastGenerated: 2026-04-08
published: true
---

# 🟡 Design Pattern Migration with Copilot

Beyond cleaning up individual functions, real-world refactoring often means migrating entire architectural patterns — replacing callback pyramids with async/await, converting class components to functions, or applying design patterns like Strategy and Factory to eliminate sprawling switch statements.

In this course you'll use Copilot's multi-file understanding and agent mode to apply design patterns and modernize entire modules.

## Prerequisites

- Completed [AI-Assisted Refactoring: Clean Code with Copilot](/Learn-GHCP/courses/technology/refactoring-beginner/)
- Familiarity with TypeScript / JavaScript
- Copilot Chat and agent mode enabled in VS Code

---

## Design Patterns with Copilot

Design patterns are reusable solutions to common problems. Copilot can identify when a pattern applies and help you implement the migration.

### When to Apply Patterns

| Code Smell | Suggested Pattern | Copilot Prompt |
|-----------|-------------------|----------------|
| Giant switch/if-else on type | **Strategy** | *"Replace this switch with a Strategy pattern"* |
| Repeated `new ClassName(...)` with conditionals | **Factory** | *"Extract object creation into a Factory"* |
| Manual event wiring with callbacks | **Observer** | *"Convert these callbacks to an Observer/EventEmitter pattern"* |
| Shared global state mutations | **Singleton → Dependency Injection** | *"Replace this singleton with dependency injection"* |
| Deeply nested decorators | **Chain of Responsibility** | *"Refactor to Chain of Responsibility pattern"* |

---

## Pattern 1: Strategy Pattern

The Strategy pattern replaces conditional logic with interchangeable algorithm objects.

### Before — Switch Statement

```typescript
// ❌ Adding a new payment method means modifying this function
function processPayment(method: string, amount: number): PaymentResult {
  switch (method) {
    case "credit_card":
      // 20 lines of credit card processing
      const ccFee = amount * 0.029 + 0.30;
      return { charged: amount + ccFee, fee: ccFee, provider: "Stripe" };
    case "paypal":
      // 15 lines of PayPal processing
      const ppFee = amount * 0.035;
      return { charged: amount + ppFee, fee: ppFee, provider: "PayPal" };
    case "crypto":
      // 25 lines of crypto processing
      const cryptoFee = 1.50;
      return { charged: amount + cryptoFee, fee: cryptoFee, provider: "Coinbase" };
    default:
      throw new Error(`Unknown payment method: ${method}`);
  }
}
```

### Ask Copilot

Select the function and use inline chat:

```
Refactor this function into a Strategy pattern. Create a PaymentStrategy
interface and separate strategy classes for each payment method.
```

### After — Strategy Pattern

```typescript
// ✅ Open for extension, closed for modification
interface PaymentStrategy {
  readonly provider: string;
  calculateFee(amount: number): number;
  process(amount: number): PaymentResult;
}

class CreditCardStrategy implements PaymentStrategy {
  readonly provider = "Stripe";
  calculateFee(amount: number): number {
    return amount * 0.029 + 0.30;
  }
  process(amount: number): PaymentResult {
    const fee = this.calculateFee(amount);
    return { charged: amount + fee, fee, provider: this.provider };
  }
}

class PayPalStrategy implements PaymentStrategy {
  readonly provider = "PayPal";
  calculateFee(amount: number): number {
    return amount * 0.035;
  }
  process(amount: number): PaymentResult {
    const fee = this.calculateFee(amount);
    return { charged: amount + fee, fee, provider: this.provider };
  }
}

class CryptoStrategy implements PaymentStrategy {
  readonly provider = "Coinbase";
  calculateFee(_amount: number): number {
    return 1.50;
  }
  process(amount: number): PaymentResult {
    const fee = this.calculateFee(amount);
    return { charged: amount + fee, fee, provider: this.provider };
  }
}

// Strategy registry — add new methods without touching existing code
const strategies: Record<string, PaymentStrategy> = {
  credit_card: new CreditCardStrategy(),
  paypal: new PayPalStrategy(),
  crypto: new CryptoStrategy(),
};

function processPayment(method: string, amount: number): PaymentResult {
  const strategy = strategies[method];
  if (!strategy) throw new Error(`Unknown payment method: ${method}`);
  return strategy.process(amount);
}
```

> 💡 **Tip:** Ask Copilot to *"Generate a unit test that verifies adding a new strategy doesn't require changes to processPayment"* to validate your pattern is correct.

---

## Pattern 2: Factory Pattern

The Factory pattern centralizes complex object creation logic.

### Before — Scattered Creation

```typescript
// ❌ Creation logic duplicated across the codebase
function createNotification(type: string, message: string, recipient: string) {
  if (type === "email") {
    return {
      channel: "email",
      to: recipient,
      subject: `Notification: ${message.slice(0, 50)}`,
      body: message,
      retries: 3,
      timeout: 30000,
    };
  } else if (type === "sms") {
    return {
      channel: "sms",
      to: recipient,
      body: message.slice(0, 160),
      retries: 1,
      timeout: 10000,
    };
  } else if (type === "push") {
    return {
      channel: "push",
      to: recipient,
      title: message.slice(0, 65),
      body: message,
      badge: 1,
      sound: "default",
    };
  }
}
```

### Ask Copilot

```
Refactor this into a Factory pattern with typed notification classes
and a NotificationFactory that creates them from a config object.
```

### After — Factory Pattern

```typescript
// ✅ Typed, extensible, self-documenting
interface Notification {
  channel: string;
  send(): Promise<void>;
}

interface NotificationConfig {
  type: "email" | "sms" | "push";
  message: string;
  recipient: string;
}

class EmailNotification implements Notification {
  channel = "email" as const;
  constructor(
    private to: string,
    private subject: string,
    private body: string,
  ) {}
  async send() { /* email sending logic */ }
}

class SmsNotification implements Notification {
  channel = "sms" as const;
  constructor(
    private to: string,
    private body: string,
  ) {}
  async send() { /* SMS sending logic */ }
}

class PushNotification implements Notification {
  channel = "push" as const;
  constructor(
    private to: string,
    private title: string,
    private body: string,
  ) {}
  async send() { /* push notification logic */ }
}

class NotificationFactory {
  static create(config: NotificationConfig): Notification {
    switch (config.type) {
      case "email":
        return new EmailNotification(
          config.recipient,
          `Notification: ${config.message.slice(0, 50)}`,
          config.message,
        );
      case "sms":
        return new SmsNotification(
          config.recipient,
          config.message.slice(0, 160),
        );
      case "push":
        return new PushNotification(
          config.recipient,
          config.message.slice(0, 65),
          config.message,
        );
    }
  }
}
```

---

## Pattern 3: Observer / EventEmitter

Replace tightly coupled callback chains with an event-driven architecture.

### Before — Callback Hell

```typescript
// ❌ Tightly coupled, hard to extend
function onUserSignup(user: User) {
  sendWelcomeEmail(user, (emailErr) => {
    if (emailErr) console.error("Email failed:", emailErr);
    createDefaultProject(user, (projErr, project) => {
      if (projErr) console.error("Project failed:", projErr);
      trackAnalytics("signup", user, () => {
        notifySlack(`New user: ${user.name}`, () => {
          console.log("Signup complete for", user.name);
        });
      });
    });
  });
}
```

### Ask Copilot

```
Refactor this callback chain into an EventEmitter pattern where each
side effect is an independent listener on a 'user:signup' event.
```

### After — Observer Pattern

```typescript
// ✅ Decoupled, extensible, each handler independent
import { EventEmitter } from "events";

const userEvents = new EventEmitter();

userEvents.on("user:signup", async (user: User) => {
  try {
    await sendWelcomeEmail(user);
  } catch (err) {
    console.error("Email failed:", err);
  }
});

userEvents.on("user:signup", async (user: User) => {
  try {
    await createDefaultProject(user);
  } catch (err) {
    console.error("Project creation failed:", err);
  }
});

userEvents.on("user:signup", async (user: User) => {
  await trackAnalytics("signup", user);
});

userEvents.on("user:signup", async (user: User) => {
  await notifySlack(`New user: ${user.name}`);
});

// Clean trigger — adding new side effects requires zero changes here
function onUserSignup(user: User) {
  userEvents.emit("user:signup", user);
}
```

---

## Migrating Callbacks to Async/Await

One of the most common modernization tasks is converting Node.js callback-style code to async/await.

### Ask Copilot

Select the callback-based code and use:

```
Convert this callback-based function to async/await with proper error handling
```

### Before

```typescript
// ❌ Classic Node.js callback pattern
function fetchUserData(userId: string, callback: (err: Error | null, data?: any) => void) {
  db.query("SELECT * FROM users WHERE id = ?", [userId], (err, rows) => {
    if (err) return callback(err);
    if (rows.length === 0) return callback(new Error("User not found"));

    const user = rows[0];
    db.query("SELECT * FROM orders WHERE user_id = ?", [userId], (err, orders) => {
      if (err) return callback(err);
      user.orders = orders;

      db.query("SELECT * FROM preferences WHERE user_id = ?", [userId], (err, prefs) => {
        if (err) return callback(err);
        user.preferences = prefs[0] || {};
        callback(null, user);
      });
    });
  });
}
```

### After

```typescript
// ✅ Flat, readable, proper error handling
async function fetchUserData(userId: string): Promise<UserWithDetails> {
  const [user] = await db.query<User[]>(
    "SELECT * FROM users WHERE id = ?",
    [userId],
  );
  if (!user) throw new NotFoundError(`User ${userId} not found`);

  const [orders, preferences] = await Promise.all([
    db.query<Order[]>("SELECT * FROM orders WHERE user_id = ?", [userId]),
    db.query<Preferences[]>("SELECT * FROM preferences WHERE user_id = ?", [userId]),
  ]);

  return {
    ...user,
    orders,
    preferences: preferences[0] ?? {},
  };
}
```

> 💡 **Tip:** Copilot often uses `Promise.all` for independent queries. Ask it to *"parallelize independent database calls with Promise.all"* if it serializes them.

---

## Class Components to Functional Components

For React codebases, converting class components to functional components with hooks is a common migration.

### Ask Copilot

```
Convert this React class component to a functional component using hooks.
Preserve all lifecycle behavior and state management.
```

### Before

```typescript
// ❌ Class component with lifecycle methods
class UserProfile extends React.Component<Props, State> {
  state = { user: null, loading: true, error: null };

  componentDidMount() {
    this.fetchUser();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.userId !== this.props.userId) {
      this.fetchUser();
    }
  }

  componentWillUnmount() {
    this.abortController?.abort();
  }

  async fetchUser() {
    this.abortController = new AbortController();
    this.setState({ loading: true, error: null });
    try {
      const res = await fetch(`/api/users/${this.props.userId}`, {
        signal: this.abortController.signal,
      });
      const user = await res.json();
      this.setState({ user, loading: false });
    } catch (err) {
      if (err.name !== "AbortError") {
        this.setState({ error: err.message, loading: false });
      }
    }
  }

  render() {
    const { user, loading, error } = this.state;
    if (loading) return <Spinner />;
    if (error) return <ErrorBanner message={error} />;
    return <ProfileCard user={user} />;
  }
}
```

### After

```typescript
// ✅ Functional component with hooks
function UserProfile({ userId }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [userId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  return <ProfileCard user={user} />;
}
```

---

## Agent Mode for Multi-File Refactoring

For refactoring that spans many files — renaming an interface used across 30 files, moving a module and updating all imports — Copilot's **agent mode** is the right tool.

### Activating Agent Mode

In VS Code Copilot Chat, switch to **Agent** mode (click the mode selector or type `@workspace`). Agent mode can:

- Read and write multiple files
- Understand cross-file dependencies
- Apply changes and run terminal commands
- Iterate based on build/test results

### Multi-File Refactoring Prompts

| Task | Agent Mode Prompt |
|------|------------------|
| Rename across project | *"Rename the `ApiResponse` interface to `HttpResponse` across the entire codebase and update all imports"* |
| Move module | *"Move `src/utils/auth.ts` to `src/auth/service.ts` and update all import paths"* |
| Extract shared type | *"Extract the `User` type that's duplicated in 5 files into `src/types/user.ts` and update all imports"* |
| Apply pattern across files | *"Apply the Repository pattern to all database access files in `src/data/`"* |

### Example: Extracting a Shared Module

```
@workspace Refactor: The validation logic in src/routes/users.ts,
src/routes/orders.ts, and src/routes/products.ts is nearly identical.
Extract the shared validation into src/middleware/validate.ts
and update all three route files to use it. Run the tests after.
```

Agent mode will:
1. Analyze all three route files
2. Identify the common validation pattern
3. Create `src/middleware/validate.ts` with the shared logic
4. Update imports in all three route files
5. Run `npm test` to verify nothing broke

---

## 🏋️ Hands-On: Modernize a Callback-Heavy Module

### The Challenge

You have a legacy data-access module with 4 callback-based functions. Your task is to modernize it using the patterns from this course.

Create `legacy-data.ts`:

```typescript
import { Database } from "./db";

const db = new Database();

export function getUser(id: string, cb: (err: Error | null, user?: any) => void) {
  db.find("users", id, (err, doc) => {
    if (err) return cb(err);
    if (!doc) return cb(new Error("Not found"));
    cb(null, doc);
  });
}

export function getUserOrders(userId: string, cb: (err: Error | null, orders?: any[]) => void) {
  db.findAll("orders", { userId }, (err, docs) => {
    if (err) return cb(err);
    cb(null, docs);
  });
}

export function createOrder(userId: string, items: any[], cb: (err: Error | null, order?: any) => void) {
  getUser(userId, (err, user) => {
    if (err) return cb(err);
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const order = { userId, items, total, status: "pending", createdAt: new Date() };
    db.insert("orders", order, (err, doc) => {
      if (err) return cb(err);
      cb(null, doc);
    });
  });
}

export function processOrder(orderId: string, paymentMethod: string, cb: (err: Error | null, result?: any) => void) {
  db.find("orders", orderId, (err, order) => {
    if (err) return cb(err);
    if (paymentMethod === "credit") {
      // process credit card
      cb(null, { ...order, status: "paid", paidVia: "credit" });
    } else if (paymentMethod === "paypal") {
      // process PayPal
      cb(null, { ...order, status: "paid", paidVia: "paypal" });
    } else {
      cb(new Error("Unknown payment method"));
    }
  });
}
```

### Your Tasks

1. **Convert all callbacks to async/await** — ask Copilot to convert each function
2. **Add TypeScript types** — replace all `any` with proper interfaces
3. **Apply Strategy pattern** to `processOrder` — extract payment methods into strategies
4. **Extract a Repository** — move database calls into a `UserRepository` and `OrderRepository`
5. **Generate tests** — ask Copilot to generate tests for the refactored module

### Validation Checklist

- ✅ Zero `any` types remaining
- ✅ Zero callback parameters
- ✅ Payment methods use Strategy pattern
- ✅ Database access uses Repository pattern
- ✅ All functions are `async` and return typed `Promise<T>`
- ✅ Tests cover happy path and error cases

---

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **Strategy Pattern** | Encapsulates interchangeable algorithms behind a common interface |
| **Factory Pattern** | Centralizes object creation logic in a single class or function |
| **Observer Pattern** | Defines a one-to-many dependency so when one object changes, all dependents are notified |
| **Agent Mode** | Copilot mode that can read/write multiple files and run terminal commands |
| **Repository Pattern** | Mediates between the domain layer and data access, providing a collection-like interface |
| **Async/Await** | Syntactic sugar for working with Promises that makes asynchronous code read sequentially |

---

## ➡️ Next Steps

- **Next course:** [Large-Scale Legacy Modernization with Copilot Agents](/Learn-GHCP/courses/technology/refactoring-advanced/) — plan and execute full codebase migrations with agents
- **Related:** [Multi-Agent Orchestration and Self-Healing CI](/Learn-GHCP/courses/agents/copilot-agents-advanced/) — automate refactoring across repositories
