---
title: "Prompt Engineering Basics for Copilot"
description: "Learn to write effective prompts for Copilot — get better suggestions by providing clear context, examples, and intent."
track: "technology"
difficulty: "beginner"
featureRefs: [code-completions, copilot-chat, ghost-text]
personaTags: [developer, student]
technologyTags: [copilot, prompting]
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

# 🟢 Prompt Engineering Basics for Copilot

Your prompts are the steering wheel for Copilot. Better prompts produce better code — instantly. In this course, you'll learn how to write effective prompts that give Copilot the context it needs to generate accurate, useful suggestions.

## Prerequisites

- GitHub Copilot active in VS Code or JetBrains IDE
- Basic programming knowledge in any language
- Willingness to experiment — prompting is a skill you build through practice

## Why Prompts Matter

Copilot doesn't read your mind — it reads your **context**. The code around your cursor, your comments, function names, and file structure all form the "prompt" that Copilot uses to generate suggestions.

| Poor Context | Rich Context | Why It Matters |
|-------------|-------------|---------------|
| `function f(x)` | `function calculateTax(income: number): number` | Descriptive names tell Copilot the purpose |
| `// do the thing` | `// Calculate compound interest with monthly compounding` | Specific comments guide generation |
| Empty file | File with imports, types, and related functions | Surrounding code provides patterns to follow |

## Anatomy of a Good Prompt

Every effective Copilot prompt contains three elements:

```
┌─────────────────────────────────────────┐
│              GOOD PROMPT                 │
│                                          │
│  1. INTENT   — What you want to build   │
│  2. CONTEXT  — Types, constraints, env  │
│  3. EXAMPLES — Input/output patterns     │
└─────────────────────────────────────────┘
```

### 1. Intent — Tell Copilot What You Want

Use a clear comment before the code you want generated:

```python
# Sort a list of dictionaries by the 'created_at' key in descending order
```

Copilot generates:

```python
def sort_by_created_at(items: list[dict]) -> list[dict]:
    return sorted(items, key=lambda x: x['created_at'], reverse=True)
```

### 2. Context — Define the Environment

Type signatures, imports, and surrounding code all provide context:

```typescript
import { z } from 'zod';

// Validate a user registration form with:
// - name: required string, 2-50 characters
// - email: valid email format
// - age: optional number, 13-120
```

Copilot generates a Zod schema that matches your constraints exactly:

```typescript
const registrationSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(13).max(120).optional(),
});
```

### 3. Examples — Show the Pattern

When you show Copilot an example, it extrapolates the pattern:

```javascript
// Convert snake_case to camelCase
// Examples:
//   "user_name"     → "userName"
//   "first_name"    → "firstName"
//   "created_at"    → "createdAt"
```

Copilot generates:

```javascript
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
```

> 💡 **Tip:** Even two examples are enough for Copilot to identify the pattern. Add a third example only if the pattern is complex.

## Comment-Driven Development

The most powerful prompting technique is **Comment-Driven Development** — write comments first, then let Copilot fill in the code.

### Step 1 — Write a Sequence of Comments

```python
# Connect to the PostgreSQL database using environment variables
# Query all active users who logged in within the last 30 days
# Group results by country
# Return as a list of dictionaries with 'country' and 'count' keys
```

### Step 2 — Let Copilot Fill Each Block

Place your cursor after the first comment and press `Enter`. Copilot generates the code for that step. Move to the next comment and repeat.

```python
import os
import psycopg2
from datetime import datetime, timedelta

# Connect to the PostgreSQL database using environment variables
conn = psycopg2.connect(
    host=os.environ['DB_HOST'],
    port=os.environ.get('DB_PORT', 5432),
    database=os.environ['DB_NAME'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD'],
)

# Query all active users who logged in within the last 30 days
cursor = conn.cursor()
thirty_days_ago = datetime.now() - timedelta(days=30)
cursor.execute(
    "SELECT country, COUNT(*) FROM users WHERE last_login >= %s AND active = true GROUP BY country",
    (thirty_days_ago,)
)

# Group results by country
rows = cursor.fetchall()

# Return as a list of dictionaries with 'country' and 'count' keys
results = [{'country': row[0], 'count': row[1]} for row in rows]
```

## Function Signature Hints

The function name and parameter types are the strongest hints you can give Copilot:

| Signature | What Copilot Generates |
|-----------|----------------------|
| `function fetchUserById(id: string): Promise<User>` | An async function that calls an API and returns a User |
| `def parse_csv(filepath: str, delimiter: str = ',') -> list[dict]` | A CSV parser that returns a list of dictionaries |
| `func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request)` | A WebSocket upgrade handler with read/write loop |

### Example: Signature as Prompt

```typescript
interface SearchOptions {
  query: string;
  page: number;
  limit: number;
  sortBy: 'relevance' | 'date' | 'title';
}

interface SearchResult {
  items: Article[];
  totalCount: number;
  hasMore: boolean;
}

async function searchArticles(options: SearchOptions): Promise<SearchResult> {
  // Copilot uses the types above to generate a complete implementation
```

## Common Prompting Mistakes

### ❌ Mistake 1: Vague Comments

```javascript
// handle the data
function process(d) { ... }
```

### ✅ Fix: Be Specific

```javascript
// Parse the JSON response, extract the 'items' array, and filter out
// any items with a null 'price' field
function extractPricedItems(response) { ... }
```

### ❌ Mistake 2: No Type Information

```python
def transform(data):
    pass
```

### ✅ Fix: Add Type Hints

```python
def transform(data: list[dict[str, Any]]) -> pd.DataFrame:
    """Convert a list of API response dictionaries into a cleaned pandas DataFrame."""
    pass
```

### ❌ Mistake 3: Conflicting Context

```javascript
// This function sorts users alphabetically
function filterActiveUsers(users) {
  // Copilot is confused — sort or filter?
}
```

### ✅ Fix: Align Name, Comment, and Types

```javascript
// Filter the user list to only include active users (status === 'active')
function filterActiveUsers(users: User[]): User[] {
  // Now Copilot knows exactly what to do
}
```

## Example-Driven Generation

For data transformation tasks, examples outperform descriptions:

### Technique: Input/Output Table as Comment

```python
# Transform user data from API format to database format
# Input:  {"firstName": "Ada", "lastName": "Lovelace", "dob": "1815-12-10"}
# Output: {"full_name": "Ada Lovelace", "birth_year": 1815}
```

Copilot generates:

```python
def transform_user(api_data: dict) -> dict:
    return {
        'full_name': f"{api_data['firstName']} {api_data['lastName']}",
        'birth_year': int(api_data['dob'].split('-')[0]),
    }
```

### Technique: Docstring Examples

```python
def format_phone(phone: str) -> str:
    """
    Format a 10-digit phone number as (XXX) XXX-XXXX.

    Examples:
        >>> format_phone("5551234567")
        '(555) 123-4567'
        >>> format_phone("1234567890")
        '(123) 456-7890'
    """
```

## Hands-On Exercises

### Exercise 1: Comment-Driven Development

Write comments for a function that:
- Takes a list of products (with name, price, category)
- Filters out products under $10
- Groups remaining products by category
- Returns a dictionary mapping categories to their average price

Write only the comments first, then let Copilot generate each block.

### Exercise 2: Fix a Bad Prompt

This prompt produces poor results:

```python
# make a thing that does stuff with strings
def f(s):
    pass
```

Rewrite it to get Copilot to generate a function that capitalizes the first letter of every word in a sentence while preserving existing uppercase letters.

**Target rewrite:**

```python
def capitalize_words(sentence: str) -> str:
    """
    Capitalize the first letter of each word while preserving existing uppercase.

    Examples:
        >>> capitalize_words("hello world")
        'Hello World'
        >>> capitalize_words("iPhone macOS")
        'IPhone MacOS'
    """
```

### Exercise 3: Example-Driven Generation

Create a conversion function using only input/output examples in comments:

```javascript
// Convert a flat array of breadcrumb strings into a nested object
// Input:  ["Home", "Products", "Electronics", "Phones"]
// Output: { label: "Home", child: { label: "Products", child: { label: "Electronics", child: { label: "Phones", child: null } } } }
```

Accept the ghost text and verify the function works with the example input.

### Exercise 4: Copilot Chat Prompting

Open Copilot Chat and try these prompts. Compare the output quality:

| Weak Prompt | Strong Prompt |
|------------|--------------|
| "Make a logger" | "Create a TypeScript logger class with info, warn, error methods that writes JSON-formatted log lines to stdout with timestamp, level, and message fields" |
| "Parse dates" | "Write a function that parses dates in ISO 8601, US (MM/DD/YYYY), and European (DD.MM.YYYY) formats and returns a JavaScript Date object. Throw an error for invalid formats." |

## The Prompting Checklist

Use this checklist every time you write a prompt:

- [ ] **Intent is clear** — Would a human developer know what you want?
- [ ] **Types are defined** — Are parameter and return types specified?
- [ ] **Names are descriptive** — Do function/variable names convey meaning?
- [ ] **Examples are provided** — For complex logic, did you include input/output samples?
- [ ] **Context is consistent** — Do comments, names, and types all agree?
- [ ] **Constraints are stated** — Are edge cases or restrictions mentioned?

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Copilot suggests the wrong language | Add a language-specific import or shebang at the top of the file |
| Suggestions are too generic | Add more specific comments, types, and examples above the cursor |
| Ghost text doesn't appear | Ensure the Copilot extension is active; try pressing `Alt+\` to trigger manually |
| Chat generates an entirely wrong approach | Break the prompt into smaller, sequential steps |
| Copilot repeats the same wrong suggestion | Change the wording of your comment or add a counter-example |

## Glossary

| Term | Definition |
|------|-----------|
| **Ghost Text** | Copilot's inline suggestion displayed as grayed-out text in your editor |
| **Prompt** | The combination of comments, code, types, and context that Copilot uses to generate suggestions |
| **Comment-Driven Development** | Writing comments first and letting Copilot generate the code to fulfill them |
| **Context Window** | The amount of surrounding code Copilot reads when generating suggestions |
| **Temperature** | A parameter that controls how creative vs. deterministic Copilot's suggestions are |
| **Few-Shot Prompting** | Providing a small number of input/output examples to guide generation |

## Next Steps

- 🟡 Continue to [Context Optimization and Instruction Files](/Learn-GHCP/courses/technology/prompt-engineering-intermediate/) to master Copilot's context window and instruction files
- 🟢 Try [AI-Powered Testing: Generate Tests with Copilot](/Learn-GHCP/courses/technology/ai-testing-beginner/) to apply your prompting skills to test generation
