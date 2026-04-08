---
title: "Copilot in Visual Studio: Getting Started"
description: "Set up GitHub Copilot in Visual Studio 2022+, learn C#/.NET-specific features, and boost your .NET development productivity."
track: "technology"
difficulty: "beginner"
featureRefs: [code-completions, copilot-chat, ghost-text]
personaTags: [developer, student]
technologyTags: [visual-studio, csharp, dotnet, copilot]
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n } from "@components/course";

## Welcome to GitHub Copilot in Visual Studio

GitHub Copilot integrates natively into Visual Studio 2022 and later, providing AI-powered completions tuned for the .NET ecosystem. This course covers installation, C# and .NET-specific suggestions, the Chat window, debugging assistance, and a hands-on exercise building an ASP.NET endpoint.

### What You Will Learn

- Install and configure Copilot in Visual Studio
- Understand IntelliCode vs Copilot and how they complement each other
- Accept C#-specific completions including LINQ and async patterns
- Use the Copilot Chat window for contextual help
- Leverage solution-wide context for more accurate suggestions
- Get debugging assistance from Copilot
- Build an ASP.NET endpoint with AI assistance

---

## Section 1 — Installation

### Prerequisites

| Requirement | Details |
|---|---|
| Visual Studio | 2022 version 17.8+ or Visual Studio 2025 |
| GitHub account | With active Copilot subscription |
| .NET SDK | 8.0 or later |

### Installing Copilot

<Step number={1}>
Open Visual Studio. Go to **Extensions → Manage Extensions**.
</Step>

<Step number={2}>
Search for **GitHub Copilot** in the Online tab. Click **Download**. Visual Studio may need to restart to complete installation.
</Step>

<Step number={3}>
After restart, go to **Tools → Options → GitHub → Copilot**. Click **Sign in** and authenticate with your GitHub account.
</Step>

<Step number={4}>
Verify the installation by checking the status bar at the bottom of the window. You should see the Copilot icon indicating it is active.
</Step>

> **Note:** Visual Studio 2025 ships with Copilot built in — no separate extension installation is needed.

---

## Section 2 — IntelliCode vs Copilot

Visual Studio includes two AI features that work together:

| Feature | IntelliCode | Copilot |
|---|---|---|
| Suggestion type | Reorders completion list | Full-line and multi-line ghost text |
| Data source | Trained on open-source patterns | Large language model |
| Scope | Single token / symbol | Entire statements and blocks |
| Activation | Automatic in completion list | Ghost text as you type |

Both features are active simultaneously. IntelliCode enhances the traditional IntelliSense dropdown while Copilot provides ghost text suggestions beyond the cursor.

---

## Section 3 — C# Completions

### LINQ Suggestions

Type a comment describing a query, and Copilot generates the LINQ expression:

```csharp
// Get all active users older than 18, sorted by last name
var result = users
    .Where(u => u.IsActive && u.Age > 18)
    .OrderBy(u => u.LastName)
    .ToList();
```

### Async / Await Patterns

Start typing an async method signature:

```csharp
public async Task<List<Product>> GetProductsByCategoryAsync(string category)
{
    // Copilot suggests the full implementation
    using var context = new AppDbContext();
    return await context.Products
        .Where(p => p.Category == category)
        .ToListAsync();
}
```

### Pattern Matching

```csharp
// Copilot generates pattern matching for shape area calculation
public double CalculateArea(Shape shape) => shape switch
{
    Circle c => Math.PI * c.Radius * c.Radius,
    Rectangle r => r.Width * r.Height,
    Triangle t => 0.5 * t.Base * t.Height,
    _ => throw new ArgumentException("Unknown shape")
};
```

### XAML and Razor Support

Copilot provides suggestions in `.xaml` and `.razor` files:

```xml
<!-- Copilot completes XAML bindings -->
<TextBox Text="{Binding UserName, Mode=TwoWay, UpdateSourceTrigger=PropertyChanged}"
         Margin="10" Padding="5" />
```

```razor
@* Copilot completes Razor components *@
<MudTable Items="@products" Hover="true" Striped="true">
    <HeaderContent>
        <MudTh>Name</MudTh>
        <MudTh>Price</MudTh>
        <MudTh>Category</MudTh>
    </HeaderContent>
    <RowTemplate>
        <MudTd>@context.Name</MudTd>
        <MudTd>@context.Price.ToString("C")</MudTd>
        <MudTd>@context.Category</MudTd>
    </RowTemplate>
</MudTable>
```

---

## Section 4 — The Chat Window

### Opening Chat

- Go to **View → GitHub Copilot Chat**, or
- Press `Ctrl+\, Ctrl+C`

### Solution-Wide Context

Unlike file-scoped editors, Visual Studio Chat can reference the entire solution:

```text
How is dependency injection configured in this solution?
```

Copilot searches across all projects in the solution to provide an accurate answer.

### Useful Chat Commands

| Command | Example |
|---|---|
| Explain code | Select code → right-click → **Ask Copilot → Explain This** |
| Generate tests | "Generate xUnit tests for the OrderService class" |
| Fix error | "Fix CS8602 null reference warning on line 45" |
| Suggest improvements | "How can I improve the performance of this LINQ query?" |

### Slash Commands in Chat

```text
/doc Generate XML documentation for the selected method
/fix Fix the current compiler error
/optimize Suggest performance improvements
/tests Generate unit tests
```

---

## Section 5 — Debugging Assistance

Copilot assists during debugging sessions:

### Exception Analysis

When the debugger breaks on an exception, Copilot can explain the root cause:

1. The debugger pauses on an unhandled exception.
2. Click the **Ask Copilot** link in the exception dialog.
3. Copilot analyzes the stack trace and suggests a fix.

### Watch Window Integration

In the Watch window, ask Copilot to evaluate complex expressions:

```text
Explain why this.orders.FirstOrDefault()?.Items is null
```

### Conditional Breakpoint Help

Right-click a breakpoint, select **Conditions**, and use Copilot to generate the condition expression:

```text
Break when the order total exceeds 1000 and the customer is from the EU region
```

---

## Section 6 — .NET-Specific Suggestions

### Entity Framework Core

```csharp
// Copilot generates migration-ready entity configurations
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.OrderDate).IsRequired();
        builder.Property(o => o.Total).HasPrecision(18, 2);
        builder.HasMany(o => o.Items)
               .WithOne(i => i.Order)
               .HasForeignKey(i => i.OrderId);
    }
}
```

### Dependency Injection

```csharp
// Copilot suggests proper DI registration
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
```

---

## Section 7 — Hands-On Exercise

<Hands0n title="Build an ASP.NET Minimal API Endpoint">

### Goal

Create an ASP.NET Minimal API with a product catalog endpoint, using Copilot for code generation.

### Steps

1. Create a new project with **ASP.NET Core Web API** template.
2. Type a comment `// Product model with Id, Name, Price, and Category` and accept the generated record.
3. Type `// In-memory product repository with CRUD operations` and accept the generated class.
4. Type `// Map product endpoints: GET all, GET by id, POST, PUT, DELETE` and accept the endpoint mappings.
5. Run the project and test with the Swagger UI.
6. Use Copilot Chat to generate a test file: "Generate integration tests for the product endpoints using WebApplicationFactory."

### Expected Result

A working API with five endpoints and corresponding tests, generated primarily by Copilot.

### Verification

```bash
dotnet run
# Navigate to https://localhost:5001/swagger
# Test each endpoint in the Swagger UI
dotnet test
```

</Hands0n>

---

## Summary

You installed Copilot in Visual Studio, learned how IntelliCode and Copilot complement each other, explored C# and .NET-specific completions, used the Chat window with solution-wide context, and built an ASP.NET endpoint with AI assistance. The next course covers enterprise .NET workflows with Copilot.
