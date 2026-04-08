---
title: "Copilot for Security: Secure Code Suggestions"
description: "Learn how Copilot helps write secure code, understand its security filters, and use Chat to identify vulnerabilities."
track: "persona"
difficulty: "beginner"
featureRefs:
  - code-completions
  - copilot-chat
personaTags:
  - security-engineer
technologyTags:
  - security
  - owasp
  - github
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

# 🟢 Copilot for Security: Secure Code Suggestions

Welcome, security engineer! In this course you'll discover how GitHub Copilot acts as a first line of defense against common vulnerabilities—right inside your editor.

## Prerequisites

- A GitHub account with Copilot access
- VS Code with the GitHub Copilot extension installed
- Basic understanding of the OWASP Top 10

## How Copilot's Security Filters Work

GitHub Copilot includes built-in filters that block insecure code patterns before they reach your editor. These filters target:

| Filter Category | Examples Blocked |
|----------------|-----------------|
| Hardcoded secrets | API keys, passwords, tokens in source code |
| Known-bad patterns | Insecure crypto algorithms (MD5, SHA-1 for passwords) |
| Injection patterns | Unparameterized SQL queries, raw HTML injection |
| Dangerous defaults | `eval()`, `exec()`, disabled TLS verification |

> 💡 **Important:** Copilot's filters are a safety net, not a replacement for proper security review. Always validate suggestions against your organization's security standards.

## Step 1: Recognize Secure vs. Insecure Suggestions

When you type a database query, Copilot will suggest parameterized queries by default.

**What Copilot suggests (secure):**

```python
import sqlite3

def get_user(db_path: str, user_id: str):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # Copilot suggests parameterized queries to prevent SQL injection
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    return cursor.fetchone()
```

**What to avoid (insecure):**

```python
# ❌ Never use string formatting for SQL queries
def get_user_insecure(db_path: str, user_id: str):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")  # SQL injection!
    return cursor.fetchone()
```

## Step 2: Use Chat to Review Code for Vulnerabilities

Open Copilot Chat (`Ctrl+Shift+I`) and ask it to review your code:

```
@workspace /security Review this file for OWASP Top 10 vulnerabilities
```

**Example: Reviewing a Node.js Express endpoint**

Paste or highlight this code, then ask Copilot Chat to review it:

```javascript
const express = require('express');
const app = express();

app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send(`<h1>Results for: ${query}</h1>`);  // XSS vulnerability
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
  // SQL injection vulnerability
});
```

Copilot Chat will identify:
1. **Reflected XSS** — user input rendered directly in HTML without escaping
2. **SQL Injection** — string concatenation in SQL queries
3. **Missing authentication controls** — no rate limiting or input validation

## Step 3: Understand GitHub Advanced Security Integration

Copilot works alongside GitHub Advanced Security (GHAS) to provide defense in depth:

```yaml
# .github/workflows/security-scan.yml
name: Security Scan
on: [push, pull_request]

jobs:
  codeql:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript, python
      - uses: github/codeql-action/analyze@v3

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for hardcoded secrets
        run: |
          echo "Secret scanning is enabled at the repository level"
          echo "Push protection blocks commits containing secrets"
```

## Step 4: Secure Code Review Workflow

Follow this step-by-step workflow for every code review:

1. **Ask Copilot Chat for a security summary:**
   ```
   Review this PR diff for security issues. Focus on injection flaws,
   authentication bypasses, and data exposure.
   ```

2. **Check for common vulnerability patterns:**
   ```
   Does this code handle user input safely? Check for XSS, CSRF, and
   injection vulnerabilities.
   ```

3. **Verify secrets management:**
   ```
   Are there any hardcoded credentials, API keys, or secrets in this code?
   Suggest how to move them to environment variables.
   ```

## 🎯 Hands-On: Identify and Fix 5 Common Vulnerabilities

Review the following code and use Copilot to fix each vulnerability:

```python
from flask import Flask, request, render_template_string
import hashlib
import os

app = Flask(__name__)
SECRET_KEY = "my-super-secret-key-123"  # Vuln 1: Hardcoded secret

@app.route('/profile')
def profile():
    name = request.args.get('name', '')
    # Vuln 2: Cross-Site Scripting (XSS)
    return render_template_string(f'<h1>Hello {name}</h1>')

@app.route('/login', methods=['POST'])
def login():
    password = request.form['password']
    # Vuln 3: Weak hashing algorithm
    hashed = hashlib.md5(password.encode()).hexdigest()
    return f"Hash: {hashed}"

@app.route('/file')
def read_file():
    filename = request.args.get('file', '')
    # Vuln 4: Path traversal
    with open(f'/data/{filename}', 'r') as f:
        return f.read()

@app.route('/redirect')
def redirect_user():
    url = request.args.get('url', '/')
    # Vuln 5: Open redirect
    return redirect(url)
```

**Ask Copilot Chat to fix each issue:**

```
Fix all 5 security vulnerabilities in this Flask app:
1. Move the hardcoded secret to an environment variable
2. Escape user input to prevent XSS
3. Replace MD5 with bcrypt for password hashing
4. Sanitize file paths to prevent directory traversal
5. Validate redirect URLs against an allowlist
```

**Expected secure version:**

```python
from flask import Flask, request, escape, redirect, abort
import bcrypt
import os
from pathlib import Path
from urllib.parse import urlparse

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY')  # Fix 1

ALLOWED_REDIRECT_HOSTS = {'example.com', 'myapp.com'}

@app.route('/profile')
def profile():
    name = request.args.get('name', '')
    return f'<h1>Hello {escape(name)}</h1>'  # Fix 2

@app.route('/login', methods=['POST'])
def login():
    password = request.form['password']
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())  # Fix 3
    return "Login processed"

@app.route('/file')
def read_file():
    filename = request.args.get('file', '')
    safe_path = Path('/data').joinpath(filename).resolve()
    if not str(safe_path).startswith('/data/'):  # Fix 4
        abort(403)
    with open(safe_path, 'r') as f:
        return f.read()

@app.route('/redirect')
def redirect_user():
    url = request.args.get('url', '/')
    parsed = urlparse(url)
    if parsed.netloc and parsed.netloc not in ALLOWED_REDIRECT_HOSTS:  # Fix 5
        abort(400)
    return redirect(url)
```

## 🎯 What You Learned

- How Copilot's security filters block insecure patterns
- Common vulnerability patterns Copilot helps you avoid
- Using Copilot Chat to perform security code reviews
- How Copilot integrates with GitHub Advanced Security
- A repeatable secure code review workflow

## 📚 Glossary

- **OWASP Top 10**: The ten most critical web application security risks
- **SQL Injection**: An attack that manipulates SQL queries through user input
- **XSS (Cross-Site Scripting)**: Injecting malicious scripts into web pages viewed by others
- **GHAS**: GitHub Advanced Security — CodeQL, secret scanning, and Dependabot
- **Parameterized query**: A query that separates SQL logic from user-supplied data

## ➡️ Next Steps

Ready to build automated security workflows? Continue to:
- 🟡 [SAST/DAST Patterns with Copilot](/Learn-GHCP/courses/persona/security-intermediate/)
