---
title: "VS Code Extension Development with Copilot"
description: "Build VS Code extensions powered by Copilot — custom commands, chat participants, and AI-enhanced editor features."
track: "technology"
difficulty: "advanced"
featureRefs: [copilot-chat, cli-plugins, code-completions]
personaTags: [developer, architect]
technologyTags: [vscode, typescript, extension-api]
prerequisites: [vscode-copilot-intermediate]
estimatedMinutes: 60
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n, Warning } from "@components/course";

## Building AI-Powered VS Code Extensions

VS Code's extension API exposes the Language Model API, allowing you to build custom chat participants, AI-driven commands, and intelligent editor features that integrate with GitHub Copilot. This course walks you through the full lifecycle — from scaffolding an extension to publishing it on the marketplace.

### What You Will Learn

- Set up a VS Code extension development environment
- Access the Language Model API from an extension
- Build a custom chat participant with domain-specific knowledge
- Create AI-powered editor commands
- Integrate Copilot completions into custom workflows
- Test and debug extensions effectively
- Publish to the Visual Studio Marketplace

---

## Section 1 — Extension Development Environment

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18 or later |
| VS Code | 1.90 or later |
| Yeoman | Latest |
| VS Code Extension Generator | Latest |

### Scaffolding a New Extension

```bash
npm install -g yo generator-code
yo code
```

Select the following options:

| Prompt | Answer |
|---|---|
| Type of extension | New Extension (TypeScript) |
| Extension name | copilot-code-analyzer |
| Identifier | copilot-code-analyzer |
| Enable strict mode | Yes |
| Bundle with webpack | Yes |
| Package manager | npm |

### Project Structure

```text
copilot-code-analyzer/
├── src/
│   ├── extension.ts         # Entry point
│   ├── participants/        # Chat participants
│   ├── commands/            # Custom commands
│   └── utils/               # Shared utilities
├── test/
│   └── suite/
│       └── extension.test.ts
├── package.json
├── tsconfig.json
└── .vscodeignore
```

---

## Section 2 — Language Model API

The Language Model API allows extensions to send prompts to the language model and receive streaming responses.

### Accessing the API

```typescript
import * as vscode from "vscode";

export async function queryLanguageModel(
  prompt: string
): Promise<string> {
  const models = await vscode.lm.selectChatModels({
    vendor: "copilot",
    family: "gpt-4o",
  });

  if (models.length === 0) {
    throw new Error("No language model available");
  }

  const model = models[0];
  const messages = [vscode.LanguageModelChatMessage.User(prompt)];

  const response = await model.sendRequest(messages, {});

  let result = "";
  for await (const chunk of response.text) {
    result += chunk;
  }

  return result;
}
```

### Streaming Responses to the User

For real-time display, stream chunks into an output channel or chat response:

```typescript
export async function streamToOutput(
  prompt: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const models = await vscode.lm.selectChatModels({
    vendor: "copilot",
    family: "gpt-4o",
  });

  const model = models[0];
  const messages = [vscode.LanguageModelChatMessage.User(prompt)];
  const response = await model.sendRequest(messages, {});

  for await (const chunk of response.text) {
    outputChannel.append(chunk);
  }
}
```

### Token Counting and Limits

```typescript
const tokenCount = await model.countTokens(messages);
const maxInput = model.maxInputTokens;

if (tokenCount > maxInput * 0.8) {
  // Trim context to stay within limits
}
```

---

## Section 3 — Custom Chat Participants

Chat participants appear in the Chat panel with an `@` mention and handle domain-specific conversations.

### Registering a Participant

In `package.json`, declare the participant:

```json
{
  "contributes": {
    "chatParticipants": [
      {
        "id": "copilot-code-analyzer.analyzer",
        "fullName": "Code Analyzer",
        "name": "analyzer",
        "description": "Analyze code quality, complexity, and patterns",
        "isSticky": true
      }
    ]
  }
}
```

### Implementing the Handler

```typescript
import * as vscode from "vscode";

export function registerAnalyzerParticipant(
  context: vscode.ExtensionContext
): void {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    chatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<void> => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      stream.markdown("Open a file to analyze.");
      return;
    }

    const code = editor.document.getText();
    const language = editor.document.languageId;

    const prompt = `Analyze this ${language} code for quality, complexity,
    and potential issues. Provide specific, actionable feedback.

    Code:
    \`\`\`${language}
    ${code}
    \`\`\``;

    const models = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: "gpt-4o",
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await models[0].sendRequest(messages, {}, token);

    for await (const chunk of response.text) {
      stream.markdown(chunk);
    }
  };

  const participant = vscode.chat.createChatParticipant(
    "copilot-code-analyzer.analyzer",
    handler
  );

  participant.iconPath = new vscode.ThemeIcon("microscope");
  context.subscriptions.push(participant);
}
```

### Using the Participant

In the Chat panel, type:

```text
@analyzer What are the main complexity hotspots in this file?
```

### Adding Slash Commands

```typescript
participant.followupProvider = {
  provideFollowups(
    result: vscode.ChatResult
  ): vscode.ChatFollowup[] {
    return [
      { prompt: "Show complexity metrics", label: "Metrics" },
      { prompt: "Suggest refactoring", label: "Refactor" },
    ];
  },
};
```

---

## Section 4 — AI-Powered Editor Commands

Commands run from the Command Palette or keybindings and perform specific AI tasks.

### Registering a Command

In `package.json`:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "copilot-code-analyzer.analyzeFunction",
        "title": "Analyze Function Complexity",
        "category": "Code Analyzer"
      },
      {
        "command": "copilot-code-analyzer.generateDocumentation",
        "title": "Generate Documentation",
        "category": "Code Analyzer"
      }
    ]
  }
}
```

### Implementing the Command

```typescript
export function registerCommands(
  context: vscode.ExtensionContext
): void {
  const analyzeCmd = vscode.commands.registerCommand(
    "copilot-code-analyzer.analyzeFunction",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const selectedCode = editor.document.getText(selection);

      if (!selectedCode) {
        vscode.window.showWarningMessage("Select a function to analyze.");
        return;
      }

      const result = await queryLanguageModel(
        `Analyze the cyclomatic complexity of this function and
        suggest ways to reduce it:\n\n${selectedCode}`
      );

      const panel = vscode.window.createWebviewPanel(
        "analysisResult",
        "Complexity Analysis",
        vscode.ViewColumn.Beside,
        {}
      );

      panel.webview.html = renderMarkdownToHtml(result);
    }
  );

  context.subscriptions.push(analyzeCmd);
}
```

### Adding Keybindings

In `package.json`:

```json
{
  "contributes": {
    "keybindings": [
      {
        "command": "copilot-code-analyzer.analyzeFunction",
        "key": "ctrl+shift+alt+a",
        "when": "editorHasSelection"
      }
    ]
  }
}
```

---

## Section 5 — Integration Patterns

### Pattern: Code Lens with AI Insights

Add clickable actions above functions that trigger AI analysis:

```typescript
export class AnalyzerCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const functionRegex = /(?:function|const|let)\s+(\w+)\s*(?:=\s*)?(?:\(|=>)/g;
    let match: RegExpExecArray | null;

    while ((match = functionRegex.exec(text)) !== null) {
      const line = document.positionAt(match.index).line;
      const range = new vscode.Range(line, 0, line, 0);

      lenses.push(
        new vscode.CodeLens(range, {
          title: "🔍 Analyze",
          command: "copilot-code-analyzer.analyzeFunction",
          arguments: [document, range],
        })
      );
    }

    return lenses;
  }
}
```

### Pattern: Diagnostic Integration

Generate AI-powered diagnostics that appear as warnings:

```typescript
export async function runDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
): Promise<void> {
  const code = document.getText();
  const analysis = await queryLanguageModel(
    `Identify potential bugs in this code. Return a JSON array with
    objects containing "line", "message", and "severity" fields.
    Code:\n${code}`
  );

  const issues = JSON.parse(analysis);
  const diagnostics: vscode.Diagnostic[] = issues.map(
    (issue: { line: number; message: string; severity: string }) => {
      const range = new vscode.Range(
        issue.line - 1, 0,
        issue.line - 1, Number.MAX_VALUE
      );
      const severity = issue.severity === "error"
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning;

      return new vscode.Diagnostic(range, issue.message, severity);
    }
  );

  collection.set(document.uri, diagnostics);
}
```

---

## Section 6 — Testing Extensions

### Unit Tests with Mocha

```typescript
import * as assert from "assert";
import * as vscode from "vscode";

suite("Code Analyzer Extension", () => {
  test("Extension activates successfully", async () => {
    const extension = vscode.extensions.getExtension(
      "your-publisher.copilot-code-analyzer"
    );
    assert.ok(extension);

    await extension?.activate();
    assert.strictEqual(extension?.isActive, true);
  });

  test("Analyze command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("copilot-code-analyzer.analyzeFunction")
    );
  });
});
```

### Running Tests

```bash
# Compile the extension
npm run compile

# Run tests in a VS Code instance
npm run test
```

### Debugging

1. Press `F5` to launch the Extension Development Host.
2. Set breakpoints in `src/extension.ts`.
3. Open a file in the development host and trigger your commands.
4. Inspect variables in the Debug panel.

---

## Section 7 — Publishing

### Preparing for Publication

1. Update `package.json` with publisher, repository, and icon fields.
2. Write a comprehensive `README.md` with screenshots.
3. Add a `CHANGELOG.md`.
4. Set the `engines.vscode` field to the minimum supported version.

### Publishing Commands

```bash
# Install the publishing tool
npm install -g @vscode/vsce

# Package the extension
vsce package

# Publish to the marketplace
vsce publish
```

### Pre-Publication Checklist

| Item | Status |
|---|---|
| Extension activates without errors | ✅ |
| All commands work as expected | ✅ |
| Chat participant responds correctly | ✅ |
| Tests pass | ✅ |
| README has screenshots and usage docs | ✅ |
| CHANGELOG documents version history | ✅ |
| `.vscodeignore` excludes test and dev files | ✅ |

---

## Section 8 — Capstone: Build an AI Code Analyzer Extension

<Hands0n title="AI Code Analyzer Extension">

### Goal

Build and publish a VS Code extension that provides AI-powered code analysis.

### Requirements

1. **Chat Participant:** Register `@analyzer` that answers code quality questions.
2. **Commands:** Implement at least two commands — analyze complexity and generate documentation.
3. **Code Lens:** Show "Analyze" lenses above each function.
4. **Diagnostics:** Run AI analysis on save and display warnings.
5. **Tests:** Write at least five unit tests covering core functionality.

### Implementation Steps

1. Scaffold the extension with `yo code`.
2. Implement the Language Model API utility in `src/utils/lm.ts`.
3. Build the chat participant in `src/participants/analyzer.ts`.
4. Create commands in `src/commands/analyze.ts` and `src/commands/document.ts`.
5. Add the Code Lens provider in `src/providers/codeLens.ts`.
6. Add the diagnostics provider in `src/providers/diagnostics.ts`.
7. Wire everything together in `src/extension.ts`.
8. Write tests in `test/suite/`.
9. Package and optionally publish.

### Evaluation Criteria

- [ ] Chat participant responds to `@analyzer` queries
- [ ] Commands appear in the Command Palette
- [ ] Code Lens actions appear above functions
- [ ] Diagnostics display after saving a file
- [ ] All tests pass
- [ ] Extension bundles without errors

</Hands0n>

---

## Summary

You built a VS Code extension that leverages the Language Model API for AI-powered features. You created a chat participant, custom commands, Code Lens providers, and diagnostic integration. You also learned testing and publishing workflows. This completes the VS Code + Copilot track.
