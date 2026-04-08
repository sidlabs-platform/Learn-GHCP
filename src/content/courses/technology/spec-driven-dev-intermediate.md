---
title: "BDD and Contract-First API Development with Copilot"
description: "Use Behavior-Driven Development and OpenAPI specs to drive Copilot's code generation for robust, well-tested APIs."
track: "technology"
difficulty: "intermediate"
featureRefs:
  - code-completions
  - copilot-chat
  - agent-mode
  - inline-chat
personaTags:
  - developer
technologyTags:
  - testing
  - bdd
  - openapi
  - typescript
  - cucumber
prerequisites:
  - spec-driven-dev-beginner
estimatedMinutes: 45
lastGenerated: 2026-04-08
published: true
---

# 🟡 BDD and Contract-First API Development with Copilot

In the beginner course you learned TDD at the unit level. Now we scale up: you'll write **Gherkin feature files** that describe API behavior in plain English and **OpenAPI specs** that define your API contract — then let Copilot generate the entire implementation.

## Prerequisites

- Completed [Spec-Driven Development with Copilot: Write Tests First](/Learn-GHCP/courses/technology/spec-driven-dev-beginner/)
- Node.js 18+ and npm
- Familiarity with REST APIs and HTTP methods
- VS Code with GitHub Copilot

## BDD with Gherkin: Specs That Everyone Can Read

Behavior-Driven Development bridges the gap between business requirements and code. Its core language is **Gherkin** — structured plain English:

```gherkin
Feature: User registration
  As a new visitor
  I want to create an account
  So that I can access personalized features

  Scenario: Successful registration
    Given the email "alice@example.com" is not already registered
    When I register with name "Alice" and email "alice@example.com" and password "Str0ng!Pass"
    Then the response status should be 201
    And the response body should contain a user ID
    And a welcome email should be queued for "alice@example.com"

  Scenario: Duplicate email
    Given the email "bob@example.com" is already registered
    When I register with name "Bob" and email "bob@example.com" and password "An0ther!Pass"
    Then the response status should be 409
    And the response body should contain error "Email already registered"
```

> 💡 **Why Gherkin works well with Copilot:** Each step is a structured, unambiguous instruction. Copilot can generate both the step definitions (glue code) and the application logic from these specs.

## Contract-First API Development with OpenAPI

Contract-first means you define the API surface **before writing any server code**. The OpenAPI specification is the standard:

```yaml
# openapi.yaml
openapi: 3.0.3
info:
  title: Task Manager API
  version: 1.0.0
  description: A spec-driven task management API

paths:
  /tasks:
    get:
      operationId: listTasks
      summary: List all tasks
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, in_progress, done]
      responses:
        "200":
          description: A list of tasks
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Task"

    post:
      operationId: createTask
      summary: Create a new task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateTaskInput"
      responses:
        "201":
          description: Task created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Task"
        "400":
          description: Validation error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

  /tasks/{taskId}:
    get:
      operationId: getTask
      summary: Get a task by ID
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: The task
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Task"
        "404":
          description: Task not found

    patch:
      operationId: updateTask
      summary: Update a task
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateTaskInput"
      responses:
        "200":
          description: Updated task
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Task"
        "404":
          description: Task not found

    delete:
      operationId: deleteTask
      summary: Delete a task
      parameters:
        - name: taskId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        "204":
          description: Task deleted
        "404":
          description: Task not found

components:
  schemas:
    Task:
      type: object
      required: [id, title, status, createdAt]
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
          maxLength: 200
        description:
          type: string
        status:
          type: string
          enum: [pending, in_progress, done]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    CreateTaskInput:
      type: object
      required: [title]
      properties:
        title:
          type: string
          maxLength: 200
        description:
          type: string

    UpdateTaskInput:
      type: object
      properties:
        title:
          type: string
          maxLength: 200
        description:
          type: string
        status:
          type: string
          enum: [pending, in_progress, done]

    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: string
        details:
          type: array
          items:
            type: string
```

## Real-World Scenario: Build a Task Manager API

Let's combine BDD and contract-first to build a fully spec-driven REST API.

### Project Setup

```bash
mkdir task-api && cd task-api
npm init -y
npm install express uuid
npm install --save-dev typescript @types/express @types/node \
  @cucumber/cucumber supertest @types/supertest ts-node jest @types/jest
```

```
task-api/
├── specs/
│   ├── openapi.yaml           ← API contract
│   └── features/
│       ├── create-task.feature ← BDD scenarios
│       ├── list-tasks.feature
│       └── update-task.feature
├── src/
│   ├── app.ts                 ← Express app
│   ├── routes/
│   │   └── tasks.ts           ← Route handlers
│   ├── models/
│   │   └── task.ts            ← Type definitions
│   └── store/
│       └── taskStore.ts       ← In-memory data store
├── step-definitions/
│   └── tasks.steps.ts         ← Cucumber step definitions
├── tsconfig.json
└── package.json
```

### Step 1: Write Gherkin Feature Files

Create `specs/features/create-task.feature`:

```gherkin
Feature: Create a task
  As an API consumer
  I want to create tasks via POST /tasks
  So that I can track work items

  Scenario: Create a task with valid input
    Given the task store is empty
    When I send a POST request to "/tasks" with body:
      """
      {
        "title": "Write unit tests",
        "description": "Cover all edge cases"
      }
      """
    Then the response status should be 201
    And the response body should have property "id" matching UUID format
    And the response body should have property "title" equal to "Write unit tests"
    And the response body should have property "status" equal to "pending"
    And the response body should have property "createdAt" matching ISO date format

  Scenario: Reject a task with missing title
    When I send a POST request to "/tasks" with body:
      """
      {
        "description": "No title provided"
      }
      """
    Then the response status should be 400
    And the response body should have property "error" equal to "Title is required"

  Scenario: Reject a task with title exceeding max length
    When I send a POST request to "/tasks" with body:
      """
      {
        "title": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      }
      """
    Then the response status should be 400
    And the response body should have property "error" containing "200 characters"
```

Create `specs/features/list-tasks.feature`:

```gherkin
Feature: List tasks
  As an API consumer
  I want to list tasks via GET /tasks
  So that I can see all work items

  Scenario: List tasks when store is empty
    Given the task store is empty
    When I send a GET request to "/tasks"
    Then the response status should be 200
    And the response body should be an empty array

  Scenario: List all tasks
    Given the following tasks exist:
      | title          | status      |
      | Write tests    | pending     |
      | Fix bug        | in_progress |
      | Deploy release | done        |
    When I send a GET request to "/tasks"
    Then the response status should be 200
    And the response body should have 3 items

  Scenario: Filter tasks by status
    Given the following tasks exist:
      | title          | status      |
      | Write tests    | pending     |
      | Fix bug        | in_progress |
      | Deploy release | done        |
    When I send a GET request to "/tasks?status=pending"
    Then the response status should be 200
    And the response body should have 1 item
    And the first item should have property "title" equal to "Write tests"
```

### Step 2: Write the OpenAPI Spec

Copy the `openapi.yaml` from the previous section into `specs/openapi.yaml`. This is your **contract** — the single source of truth for request/response shapes.

### Step 3: Use Copilot Agent Mode to Implement from Specs

Open VS Code with the `task-api` folder. Switch Copilot Chat to **Agent mode** and enter:

```
Read the OpenAPI spec at specs/openapi.yaml and the Gherkin feature files
in specs/features/.

Generate:
1. TypeScript types in src/models/task.ts matching the OpenAPI schemas
2. An in-memory store in src/store/taskStore.ts
3. Express route handlers in src/routes/tasks.ts implementing all endpoints
4. The Express app in src/app.ts wiring everything together

All endpoints must conform to the OpenAPI spec and satisfy the Gherkin scenarios.
Use uuid for IDs. Validate inputs and return proper error responses.
```

Copilot agent mode will read the spec files, plan the implementation, create each file, and iterate until the code compiles.

### Step 4: Generate Step Definitions from Gherkin

Now ask Copilot to generate the Cucumber glue code:

```
Read the Gherkin feature files in specs/features/ and generate
Cucumber step definitions in step-definitions/tasks.steps.ts.

Use supertest to make HTTP requests against the Express app from src/app.ts.
Use assert or expect for assertions. Match UUID and ISO date formats with regex.
```

The generated step definitions should look similar to:

```typescript
import { Given, When, Then, Before } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import request from "supertest";
import { app } from "../src/app";
import { taskStore } from "../src/store/taskStore";

let response: request.Response;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

Before(() => {
  taskStore.clear();
});

Given("the task store is empty", () => {
  taskStore.clear();
});

Given("the following tasks exist:", (dataTable: any) => {
  const rows = dataTable.hashes();
  for (const row of rows) {
    taskStore.create({ title: row.title, status: row.status });
  }
});

When(
  "I send a POST request to {string} with body:",
  async (path: string, body: string) => {
    response = await request(app)
      .post(path)
      .send(JSON.parse(body))
      .set("Content-Type", "application/json");
  }
);

When("I send a GET request to {string}", async (path: string) => {
  response = await request(app).get(path);
});

Then("the response status should be {int}", (status: number) => {
  assert.equal(response.status, status);
});

Then(
  "the response body should have property {string} matching UUID format",
  (prop: string) => {
    assert.match(response.body[prop], UUID_REGEX);
  }
);

Then(
  "the response body should have property {string} matching ISO date format",
  (prop: string) => {
    assert.match(response.body[prop], ISO_DATE_REGEX);
  }
);

Then(
  "the response body should have property {string} equal to {string}",
  (prop: string, value: string) => {
    assert.equal(response.body[prop], value);
  }
);

Then(
  "the response body should have property {string} containing {string}",
  (prop: string, substring: string) => {
    assert.ok(
      response.body[prop].includes(substring),
      `Expected "${response.body[prop]}" to contain "${substring}"`
    );
  }
);

Then("the response body should be an empty array", () => {
  assert.deepEqual(response.body, []);
});

Then("the response body should have {int} items", (count: number) => {
  assert.equal(response.body.length, count);
});

Then("the response body should have {int} item", (count: number) => {
  assert.equal(response.body.length, count);
});

Then(
  "the first item should have property {string} equal to {string}",
  (prop: string, value: string) => {
    assert.equal(response.body[0][prop], value);
  }
);
```

### Step 5: Validate Contract Compliance

Run the Cucumber tests:

```bash
npx cucumber-js --require-module ts-node/register \
  --require step-definitions/**/*.ts \
  specs/features/**/*.feature
```

Every passing scenario proves that your implementation matches both the **behavioral spec** (Gherkin) and the **structural contract** (OpenAPI).

## Copilot Instructions for Spec-First Enforcement

Add a `.github/copilot-instructions.md` file to your project so Copilot always follows the spec-first workflow:

```markdown
## Spec-First Development Rules

1. **Never implement without a spec.** Before writing any route handler,
   there must be a corresponding Gherkin scenario in `specs/features/`
   and a matching path in `specs/openapi.yaml`.

2. **Types come from OpenAPI.** All TypeScript interfaces in `src/models/`
   must match the `components.schemas` section of `openapi.yaml`.

3. **Validate inputs.** Every POST/PATCH handler must validate the request
   body against the OpenAPI schema constraints (required fields, maxLength,
   enum values) and return a 400 with an `ErrorResponse` on failure.

4. **Test coverage.** Every new endpoint must have:
   - At least one happy-path Gherkin scenario
   - At least one error-case Gherkin scenario
   - Corresponding step definitions in `step-definitions/`

5. **No spec drift.** If you change the OpenAPI spec, update the Gherkin
   scenarios and TypeScript types to match. All three must stay in sync.
```

## The Spec → Type → Implementation → Validation Cycle

This is the pattern you should internalize:

```
┌────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  1. Write Spec │────►│ 2. Generate     │────►│ 3. Implement     │
│  (OpenAPI +    │     │    Types        │     │    Handlers      │
│   Gherkin)     │     │  (from schema)  │     │  (from spec)     │
└────────────────┘     └─────────────────┘     └────────┬─────────┘
                                                        │
                  ┌─────────────────────────────────────┘
                  ▼
         ┌──────────────────┐     ┌──────────────────┐
         │ 4. Run Gherkin   │────►│ 5. Fix & Iterate │
         │    Tests         │     │  (if failures)   │
         └──────────────────┘     └──────────────────┘
```

Each spec change triggers a new cycle. The specs are always authoritative.

## Tools Reference

| Tool | Purpose | Install |
|------|---------|---------|
| **Cucumber.js** | Gherkin test runner for BDD | `npm i -D @cucumber/cucumber` |
| **Supertest** | HTTP assertions for Express apps | `npm i -D supertest` |
| **OpenAPI** | API contract specification format | Write YAML manually or use Swagger Editor |
| **Swagger UI** | Visual API documentation from OpenAPI | `npm i swagger-ui-express` |
| **openapi-typescript** | Generate TS types from OpenAPI | `npm i -D openapi-typescript` |

## 🎯 What You Learned

- How to write Gherkin feature files that describe API behavior in plain English
- How to create an OpenAPI 3.0 contract before writing any server code
- How to use Copilot agent mode to implement an entire API from specs
- How to generate Cucumber step definitions that validate spec compliance
- How to enforce spec-first workflows with `.github/copilot-instructions.md`

## 🏋️ Extension Challenge: API Versioning with Contract Tests

Add API versioning to your Task Manager:

1. Create `specs/openapi-v2.yaml` with a new `priority` field on tasks
2. Write Gherkin scenarios for backward-compatible behavior
3. Use Copilot to implement version routing (`/v1/tasks` vs `/v2/tasks`)
4. Write contract tests that verify both versions simultaneously

## ➡️ Next Steps

Ready to build fully autonomous spec-to-production pipelines? Continue to the advanced course:

- 🔴 [Autonomous Spec-to-Production Pipelines with Copilot Agents](/Learn-GHCP/courses/technology/spec-driven-dev-advanced/)
