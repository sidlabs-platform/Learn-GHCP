---
title: "What is MCP? Connect Copilot to External Tools"
description: "Learn the Model Context Protocol fundamentals and connect Copilot CLI to the GitHub MCP server for enhanced repository interactions."
track: "mcp"
difficulty: "beginner"
featureRefs:
  - mcp-integration
personaTags:
  - developer
  - student
technologyTags:
  - mcp
  - github
  - copilot
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

# 🟢 What is MCP? Connect Copilot to External Tools

AI assistants are powerful — but they become transformative when they can reach **outside** the conversation and interact with real systems. That's exactly what the **Model Context Protocol (MCP)** enables. In this course you'll learn what MCP is, how it works, and connect Copilot CLI to the GitHub MCP server so you can query repositories, issues, and pull requests using natural language.

## Prerequisites

- A GitHub account with Copilot access
- GitHub Copilot CLI installed and authenticated (`ghcp` works in your terminal)
- Node.js 20+ installed
- Git installed

## What is MCP?

**Model Context Protocol (MCP)** is an open standard that lets AI models talk to external tools and data sources through a unified interface. Think of it as a **USB-C port for AI**: one protocol, many devices.

Without MCP, every AI integration requires custom glue code. With MCP, any compliant client can connect to any compliant server — instantly gaining new capabilities.

### Why MCP Matters

| Before MCP | With MCP |
|------------|----------|
| Each tool needs a custom AI integration | One protocol connects any client to any server |
| Capabilities are hardcoded into the model | Capabilities are discovered dynamically at runtime |
| Switching AI providers means rewriting integrations | Servers work with any MCP-compatible client |
| Tool descriptions live in application code | Tools are self-describing with JSON Schema |

## MCP Architecture

MCP follows a **client → server** model with three core concepts:

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   MCP Host   │         │  MCP Client  │         │  MCP Server  │
│ (Copilot CLI)│ ──────▶ │  (built-in)  │ ──────▶ │ (GitHub MCP) │
└──────────────┘         └──────────────┘         └──────────────┘
                              │                         │
                              │   Transport Layer       │
                              │  (stdio / HTTP+SSE)     │
                              └─────────────────────────┘
```

### The Three Layers

1. **Host** — The AI application (e.g., Copilot CLI, VS Code, Claude Desktop). It decides *when* to call tools.
2. **Client** — Lives inside the host. Manages the connection lifecycle and speaks the MCP wire protocol.
3. **Server** — An external process that exposes **tools**, **resources**, and **prompts** over a transport.

### Transport Types

| Transport | How It Works | Best For |
|-----------|-------------|----------|
| **stdio** | Host spawns the server as a child process; communication over stdin/stdout | Local tools, CLI integrations |
| **HTTP + SSE** | Server runs as a web service; client connects over HTTP | Remote/shared servers, cloud deployments |

### The MCP Handshake

When a client connects to a server, they perform a capability negotiation:

```
Client                          Server
  │                                │
  │──── initialize ───────────────▶│
  │◀─── initialize result ────────│   (server capabilities + tool list)
  │──── initialized ──────────────▶│
  │                                │
  │  ... ready for tools/call ...  │
```

The server responds with its capabilities, including a list of **tools** — each with a name, description, and JSON Schema for its inputs.

## Step 1: Understand the GitHub MCP Server

The **GitHub MCP server** (`github-mcp-server`) gives AI clients access to the GitHub API. With it, Copilot can:

- Search repositories, issues, and pull requests
- Read file contents and commit history
- List branches and compare diffs
- Get workflow run statuses

It ships as an npm package and uses **stdio** transport.

## Step 2: Configure the MCP Server

Copilot CLI reads MCP server definitions from a JSON configuration file. Create or edit your config:

**macOS / Linux:** `~/.copilot/mcp-config.json`
**Windows:** `%USERPROFILE%\.copilot\mcp-config.json`

Add the GitHub MCP server:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-pat-here>"
      }
    }
  }
}
```

> 💡 **Tip:** Generate a personal access token at [github.com/settings/tokens](https://github.com/settings/tokens) with `repo` and `read:org` scopes.

## Step 3: Verify the Connection

Start a Copilot CLI session and verify the server loaded:

```bash
ghcp
```

Then ask Copilot to use a GitHub tool:

```
List the open issues in the microsoft/TypeScript repository
```

**Expected behavior:** Copilot calls the `search_issues` or `list_issues` tool from the GitHub MCP server and returns formatted results — all without you writing a single API call.

## Step 4: Explore MCP Capabilities

Try these prompts to exercise different tools:

### Search Repositories
```
Find popular Python machine-learning repositories with more than 10,000 stars
```

### Read File Contents
```
Show me the README.md from the facebook/react repository
```

### List Pull Requests
```
What are the 5 most recent open PRs in vercel/next.js?
```

### Get Commit History
```
Show the last 10 commits on the main branch of golang/go
```

Each prompt triggers different MCP tool calls. Notice how Copilot automatically selects the right tool based on your natural language query.

## Step 5: Inspect What Happened

To see which tools were called, you can ask Copilot directly:

```
What MCP tools did you just use?
```

Copilot will describe which server and tool it invoked, along with the parameters it sent.

## Practical Exercise

**Task:** Use Copilot + the GitHub MCP server to answer these questions about any public repository of your choice:

1. How many open issues does it have?
2. What was the most recent commit message on the default branch?
3. Who are the top 3 contributors by recent commit count?

Write down the prompts you used and the tools Copilot selected. This builds intuition for how MCP tool selection works.

## Troubleshooting

### "No MCP servers configured"

- Verify your `mcp-config.json` exists in the correct location
- Check that the JSON is valid (no trailing commas, proper quoting)
- Restart the Copilot CLI session after editing the config

### "Server failed to start"

- Ensure `npx` is available on your PATH (`npx --version`)
- Check that your personal access token is valid and has the required scopes
- Try running the server manually to see error output:

```bash
GITHUB_PERSONAL_ACCESS_TOKEN=<your-pat> npx -y @modelcontextprotocol/server-github
```

### "Tool call returned an error"

- GitHub API rate limits apply — authenticated requests get 5,000/hour
- Some queries require specific token scopes (e.g., private repos need full `repo` scope)
- Check that the repository name is spelled correctly (owner/repo format)

## 📚 Glossary

| Term | Definition |
|------|-----------|
| **MCP** | Model Context Protocol — an open standard for connecting AI models to external tools |
| **MCP Host** | The AI application that uses MCP (e.g., Copilot CLI) |
| **MCP Client** | The component inside the host that manages the MCP connection |
| **MCP Server** | An external process that exposes tools, resources, and prompts |
| **Tool** | A function the server exposes that the AI can call (e.g., `search_issues`) |
| **Resource** | Read-only data the server can provide (e.g., file contents) |
| **Transport** | The communication channel between client and server (stdio or HTTP+SSE) |
| **stdio** | Standard input/output — the server runs as a child process |
| **JSON-RPC** | The message format MCP uses on the wire |
| **Capability Negotiation** | The handshake where client and server agree on supported features |

## 🎯 What You Learned

- What MCP is and why it's important for AI-tool integration
- The three-layer architecture: Host → Client → Server
- How stdio and HTTP+SSE transports differ
- How to configure and connect the GitHub MCP server to Copilot CLI
- How to use natural language to trigger MCP tool calls
- How to troubleshoot common connection issues

## ➡️ Next Steps

Ready to build your own MCP server? Continue to the intermediate course:
- 🟡 [Build a Custom stdio MCP Server](/Learn-GHCP/courses/mcp/mcp-intermediate/)
