---
title: "Advanced Test Strategies with Copilot"
description: "Master edge case testing, integration tests, snapshot testing, and test refactoring using Copilot's contextual understanding."
track: "technology"
difficulty: "intermediate"
featureRefs: [code-completions, copilot-chat, inline-chat]
personaTags: [developer]
technologyTags: [testing, jest, cypress, playwright]
prerequisites: [ai-testing-beginner]
estimatedMinutes: 40
lastGenerated: 2026-04-08
published: true
---

# 🟡 Advanced Test Strategies with Copilot

Move beyond basic test generation. In this course, you'll use Copilot to identify edge cases, build integration tests, write E2E tests with Playwright, and refactor existing test suites — all while learning the thinking process behind great tests.

## Prerequisites

- Completed [AI-Powered Testing: Generate Tests with Copilot](/Learn-GHCP/courses/technology/ai-testing-beginner/)
- Comfortable with Jest or pytest
- Node.js 18+ with a working project
- Familiarity with async/await and promises

## Edge Case Identification with Copilot

The best tests aren't the happy-path ones — they're the ones that catch the inputs nobody expected. Copilot excels at suggesting edge cases because it has seen millions of test patterns.

### Technique: Ask Copilot for Edge Cases

Given a function like this:

```typescript
function parseAge(input: string): number {
  const age = parseInt(input, 10);
  if (isNaN(age)) throw new Error('Invalid age');
  if (age < 0 || age > 150) throw new Error('Age out of range');
  return age;
}
```

Ask Copilot Chat:

```
What edge cases should I test for the parseAge function? Consider boundary values,
type coercion, and unexpected inputs.
```

Copilot suggests cases you might not think of:

```typescript
describe('parseAge edge cases', () => {
  it('should parse "0" as 0', () => {
    expect(parseAge('0')).toBe(0);
  });

  it('should parse "150" as the upper boundary', () => {
    expect(parseAge('150')).toBe(150);
  });

  it('should throw for "151" (just above upper boundary)', () => {
    expect(() => parseAge('151')).toThrow('Age out of range');
  });

  it('should throw for "-1" (just below lower boundary)', () => {
    expect(() => parseAge('-1')).toThrow('Age out of range');
  });

  it('should parse "25.9" as 25 (parseInt truncates)', () => {
    expect(parseAge('25.9')).toBe(25);
  });

  it('should throw for empty string', () => {
    expect(() => parseAge('')).toThrow('Invalid age');
  });

  it('should parse "007" correctly', () => {
    expect(parseAge('007')).toBe(7);
  });

  it('should throw for "twelve"', () => {
    expect(() => parseAge('twelve')).toThrow('Invalid age');
  });

  it('should parse "42abc" as 42 (parseInt stops at non-digit)', () => {
    expect(parseAge('42abc')).toBe(42);
  });
});
```

> 💡 **Tip:** The last test case reveals a real bug — `parseInt("42abc")` returns `42`, which may not be the desired behavior. Copilot's edge case surfaced a design flaw!

### The Boundary Value Analysis Pattern

```
        ┌─── Test BELOW boundary
        │      ┌─── Test AT boundary
        │      │      ┌─── Test ABOVE boundary
        ▼      ▼      ▼
 ───(─1)───[0]───(1)───────────(149)───[150]───(151)───
        ❌     ✅     ✅              ✅      ✅       ❌
```

Always test the value just below, at, and just above every boundary.

## Integration Test Generation

Integration tests verify that components work correctly together. Copilot can generate these when you provide context about the connected components.

### Step 1 — Set Up the Components

```typescript
// userRepository.ts
export class UserRepository {
  private db: Database;
  constructor(db: Database) { this.db = db; }

  async findById(id: string): Promise<User | null> {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id]);
  }

  async save(user: User): Promise<User> {
    const result = await this.db.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [user.name, user.email]
    );
    return result;
  }
}

// userService.ts
export class UserService {
  constructor(private repo: UserRepository, private emailer: EmailService) {}

  async registerUser(name: string, email: string): Promise<User> {
    const existing = await this.repo.findByEmail(email);
    if (existing) throw new Error('Email already registered');
    const user = await this.repo.save({ name, email });
    await this.emailer.sendWelcome(user.email);
    return user;
  }
}
```

### Step 2 — Ask Copilot for Integration Tests

```
Write integration tests for UserService.registerUser that test the interaction
between UserService, UserRepository, and EmailService. Use Jest mocks.
```

```typescript
import { UserService } from './userService';
import { UserRepository } from './userRepository';
import { EmailService } from './emailService';

describe('UserService.registerUser integration', () => {
  let service: UserService;
  let mockRepo: jest.Mocked<UserRepository>;
  let mockEmailer: jest.Mocked<EmailService>;

  beforeEach(() => {
    mockRepo = {
      findByEmail: jest.fn(),
      save: jest.fn(),
    } as any;
    mockEmailer = {
      sendWelcome: jest.fn(),
    } as any;
    service = new UserService(mockRepo, mockEmailer);
  });

  it('should save user and send welcome email for new registration', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.save.mockResolvedValue({ id: '1', name: 'Ada', email: 'ada@example.com' });
    mockEmailer.sendWelcome.mockResolvedValue(undefined);

    const user = await service.registerUser('Ada', 'ada@example.com');

    expect(user.name).toBe('Ada');
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('ada@example.com');
    expect(mockRepo.save).toHaveBeenCalledWith({ name: 'Ada', email: 'ada@example.com' });
    expect(mockEmailer.sendWelcome).toHaveBeenCalledWith('ada@example.com');
  });

  it('should throw if email is already registered', async () => {
    mockRepo.findByEmail.mockResolvedValue({ id: '1', name: 'Ada', email: 'ada@example.com' });

    await expect(service.registerUser('Ada', 'ada@example.com'))
      .rejects.toThrow('Email already registered');

    expect(mockRepo.save).not.toHaveBeenCalled();
    expect(mockEmailer.sendWelcome).not.toHaveBeenCalled();
  });

  it('should not send email if save fails', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.save.mockRejectedValue(new Error('DB connection lost'));

    await expect(service.registerUser('Ada', 'ada@example.com'))
      .rejects.toThrow('DB connection lost');

    expect(mockEmailer.sendWelcome).not.toHaveBeenCalled();
  });
});
```

## E2E Tests with Playwright

End-to-end tests validate the full user flow in a real browser. Copilot generates Playwright tests from natural language descriptions.

### Step 1 — Describe the Flow

Ask Copilot Chat:

```
Write a Playwright E2E test for a login page. The page has an email input,
password input, and submit button. On success it redirects to /dashboard.
On failure it shows an error message with class .error-message.
```

### Step 2 — Review the Generated Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should log in successfully with valid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'SecurePass123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Invalid');
  });

  test('should show validation error for empty email', async ({ page }) => {
    await page.click('button[type="submit"]');

    await expect(page.locator('input[name="email"]')).toHaveAttribute(
      'aria-invalid', 'true'
    );
  });

  test('should preserve email on failed login attempt', async ({ page }) => {
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('input[name="email"]')).toHaveValue('user@example.com');
  });
});
```

> 💡 **Tip:** Use inline chat (`Ctrl+I`) to refine individual test cases. Select a test and ask: "Add a test for rate limiting after 5 failed attempts."

## Snapshot Testing

Snapshots are useful for detecting unintended output changes. Copilot generates snapshot tests when prompted.

```typescript
import { render } from '@testing-library/react';
import { UserCard } from './UserCard';

describe('UserCard snapshots', () => {
  it('should match snapshot for basic user', () => {
    const { container } = render(
      <UserCard name="Ada Lovelace" role="Engineer" avatar="/ada.png" />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot when avatar is missing', () => {
    const { container } = render(
      <UserCard name="Ada Lovelace" role="Engineer" />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with long name', () => {
    const { container } = render(
      <UserCard
        name="Professor Bartholomew Alexander Worthington III"
        role="Distinguished Engineer"
        avatar="/bart.png"
      />
    );
    expect(container).toMatchSnapshot();
  });
});
```

## Test Data Factories

Hardcoded test data leads to brittle tests. Use factories to generate realistic data. Ask Copilot:

```
Create a test data factory for User objects using faker.js.
Each user should have id, name, email, role, and createdAt.
```

```typescript
import { faker } from '@faker-js/faker';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
}

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: faker.helpers.arrayElement(['admin', 'editor', 'viewer']),
    createdAt: faker.date.past(),
    ...overrides,
  };
}

// Usage in tests
const admin = createUser({ role: 'admin' });
const recentUser = createUser({ createdAt: new Date() });
const batch = Array.from({ length: 10 }, () => createUser());
```

## Mocking Strategies

| Strategy | When to Use | Copilot Prompt |
|----------|-------------|---------------|
| **jest.fn()** | Simple function mocks | "Mock the callback function" |
| **jest.spyOn()** | Spy on existing methods | "Spy on console.error in this test" |
| **jest.mock()** | Mock entire modules | "Mock the axios module for this test file" |
| **Manual mock** | Complex module replacements | "Create a manual mock for the database module" |

### Example: Mocking an API Call

```typescript
import axios from 'axios';
import { fetchUserProfile } from './api';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('fetchUserProfile', () => {
  it('should return user data on success', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { id: '1', name: 'Ada', email: 'ada@example.com' },
    });

    const user = await fetchUserProfile('1');

    expect(user.name).toBe('Ada');
    expect(mockedAxios.get).toHaveBeenCalledWith('/api/users/1');
  });

  it('should throw on network error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));

    await expect(fetchUserProfile('1')).rejects.toThrow('Network Error');
  });
});
```

## Test Refactoring Patterns

Copilot can refactor messy test suites. Select a block of repetitive tests and use inline chat:

```
Refactor these tests to use test.each for the repeated pattern
```

**Before:**

```typescript
it('should validate "hello"', () => { expect(isValid('hello')).toBe(true); });
it('should validate "world"', () => { expect(isValid('world')).toBe(true); });
it('should reject ""', () => { expect(isValid('')).toBe(false); });
it('should reject null', () => { expect(isValid(null)).toBe(false); });
```

**After:**

```typescript
it.each([
  ['hello', true],
  ['world', true],
  ['', false],
  [null, false],
])('isValid(%s) should return %s', (input, expected) => {
  expect(isValid(input)).toBe(expected);
});
```

## Hands-On Exercise: Full Test Suite for a Shopping Cart

Build and test a shopping cart module using everything you've learned.

### 1. Create the Module

```typescript
// cart.ts
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export class ShoppingCart {
  private items: CartItem[] = [];

  addItem(item: Omit<CartItem, 'quantity'>, quantity = 1): void {
    const existing = this.items.find(i => i.id === item.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({ ...item, quantity });
    }
  }

  removeItem(id: string): void {
    this.items = this.items.filter(i => i.id !== id);
  }

  getTotal(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  applyDiscount(percent: number): number {
    if (percent < 0 || percent > 100) throw new Error('Invalid discount');
    return this.getTotal() * (1 - percent / 100);
  }

  getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  clear(): void {
    this.items = [];
  }
}
```

### 2. Generate Tests

Ask Copilot:

```
Write comprehensive Jest tests for the ShoppingCart class. Include:
- Unit tests for each method
- Edge cases (empty cart, duplicate items, boundary discounts)
- Integration tests for multi-step workflows (add → discount → remove → total)
```

### 3. Verify Coverage

```bash
npx jest cart.test.ts --coverage --verbose
```

Aim for **95%+ line coverage**. Ask Copilot to fill any gaps.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Mocks not resetting between tests | Add `jest.clearAllMocks()` in `beforeEach` |
| Playwright tests timing out | Increase timeout: `test.setTimeout(30000)` |
| Snapshot tests failing after intentional changes | Run `npx jest --updateSnapshot` |
| Copilot generating tests for wrong test framework | Add `// @jest-environment jsdom` or framework-specific comments |

## Glossary

| Term | Definition |
|------|-----------|
| **Edge Case** | An input at the extreme boundary of expected values |
| **Mock** | A simulated object that mimics the behavior of a real dependency |
| **Spy** | A wrapper around a real function that records calls without replacing behavior |
| **Snapshot Test** | A test that captures output and compares it to a saved reference |
| **Test Factory** | A helper function that generates test data with sensible defaults |
| **E2E Test** | A test that exercises the full application stack through a real browser |
| **test.each** | A Jest feature for running the same test with different input/output pairs |

## Next Steps

- 🔴 Continue to [Autonomous Test Infrastructure with Copilot Agents](/Learn-GHCP/courses/technology/ai-testing-advanced/) for mutation testing, visual regression, and CI/CD pipelines
- 🟡 Try [Context Optimization and Instruction Files](/Learn-GHCP/courses/technology/prompt-engineering-intermediate/) to improve the quality of Copilot's test generation
