---
title: "Visual Studio + Copilot: Enterprise .NET Workflows"
description: "Use Copilot for enterprise .NET development — solution-wide refactoring, NuGet patterns, and test generation."
track: "technology"
difficulty: "intermediate"
featureRefs: [copilot-chat, agent-mode, code-completions]
personaTags: [developer]
technologyTags: [visual-studio, csharp, dotnet, testing]
prerequisites: [visual-studio-copilot-beginner]
estimatedMinutes: 40
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n, Warning } from "@components/course";

## Enterprise .NET Workflows with Copilot

Enterprise .NET solutions often span multiple projects, hundreds of files, and complex dependency graphs. Copilot's solution-wide context, refactoring assistance, and test generation capabilities make it a powerful tool for large-scale development. This course covers cross-project refactoring, test generation, Entity Framework Core workflows, Blazor development, performance profiling, and NuGet management.

### What You Will Learn

- Use solution-wide context for accurate multi-project assistance
- Refactor code across multiple projects safely
- Generate xUnit and NUnit tests with comprehensive coverage
- Scaffold Entity Framework Core migrations with AI help
- Build Blazor components with Copilot
- Profile and optimize performance with AI guidance
- Manage NuGet dependencies effectively

---

## Section 1 — Solution-Wide Context

### How Context Works

Visual Studio provides Copilot with context from the entire loaded solution, not just the active file. This means:

- References across projects are understood
- Interface implementations are tracked
- NuGet package APIs are recognized
- Project dependencies influence suggestions

### Maximizing Context Quality

| Practice | Benefit |
|---|---|
| Keep the solution loaded | Copilot sees all projects |
| Use meaningful names | AI understands intent better |
| Add XML documentation | Copilot references doc comments |
| Organize by convention | Standard patterns are recognized |

### Querying Across Projects

```text
@workspace Which classes implement IOrderRepository across all projects?
```

Copilot searches every project in the solution and returns a comprehensive list with file paths.

---

## Section 2 — Cross-Project Refactoring

### Rename Refactoring with AI Assistance

When renaming an interface method, Copilot helps update all implementations:

1. Rename `IOrderRepository.GetOrders()` to `IOrderRepository.GetOrdersAsync()`.
2. Use Copilot Chat: "Update all implementations of GetOrders to be async and return Task<List<Order>>."
3. Copilot identifies every implementation across projects and generates the changes.

### Extract Interface Pattern

Select a class and ask Copilot:

```text
Extract an interface from OrderService that includes all public methods.
Place the interface in the Contracts project.
```

Copilot generates the interface and updates dependency injection registrations.

### Move and Restructure

```text
Move all DTOs from the API project to a shared Contracts project.
Update all using statements and project references.
```

### Safe Refactoring Workflow

1. **Ask Copilot** to analyze the change impact first.
2. **Review** the proposed changes in the diff viewer.
3. **Apply** changes with the built-in refactoring tools.
4. **Verify** by building the entire solution.
5. **Run tests** to confirm behavior is preserved.

---

## Section 3 — Test Generation

### xUnit Test Generation

Select a service class and use Chat:

```text
Generate xUnit tests for OrderService with Moq for dependencies.
Cover all public methods including edge cases and error paths.
```

Copilot generates:

```csharp
public class OrderServiceTests
{
    private readonly Mock<IOrderRepository> _repositoryMock;
    private readonly Mock<ILogger<OrderService>> _loggerMock;
    private readonly OrderService _sut;

    public OrderServiceTests()
    {
        _repositoryMock = new Mock<IOrderRepository>();
        _loggerMock = new Mock<ILogger<OrderService>>();
        _sut = new OrderService(
            _repositoryMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public async Task GetOrderAsync_WithValidId_ReturnsOrder()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        var expectedOrder = new Order { Id = orderId, Total = 99.99m };
        _repositoryMock
            .Setup(r => r.GetByIdAsync(orderId))
            .ReturnsAsync(expectedOrder);

        // Act
        var result = await _sut.GetOrderAsync(orderId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(orderId, result.Id);
        Assert.Equal(99.99m, result.Total);
    }

    [Fact]
    public async Task GetOrderAsync_WithInvalidId_ThrowsNotFoundException()
    {
        // Arrange
        var orderId = Guid.NewGuid();
        _repositoryMock
            .Setup(r => r.GetByIdAsync(orderId))
            .ReturnsAsync((Order?)null);

        // Act & Assert
        await Assert.ThrowsAsync<OrderNotFoundException>(
            () => _sut.GetOrderAsync(orderId));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-100)]
    public async Task CreateOrderAsync_WithInvalidTotal_ThrowsValidationException(
        decimal invalidTotal)
    {
        // Arrange
        var request = new CreateOrderRequest { Total = invalidTotal };

        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(
            () => _sut.CreateOrderAsync(request));
    }
}
```

### NUnit Test Generation

```text
Generate NUnit tests for the same service using NSubstitute instead of Moq.
```

### Integration Test Generation

```text
Generate integration tests for ProductsController using WebApplicationFactory.
Include tests for authentication, validation, and pagination.
```

```csharp
public class ProductsControllerTests
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ProductsControllerTests(
        WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase("TestDb"));
            });
        }).CreateClient();
    }

    [Fact]
    public async Task GetProducts_ReturnsSuccessAndCorrectContentType()
    {
        var response = await _client.GetAsync("/api/products");

        response.EnsureSuccessStatusCode();
        Assert.Equal("application/json; charset=utf-8",
            response.Content.Headers.ContentType?.ToString());
    }
}
```

---

## Section 4 — Entity Framework Core Workflows

### Generating Entity Configurations

Describe your entity in a comment and let Copilot build the configuration:

```csharp
// Customer entity with Name (required, max 200), Email (required, unique),
// DateOfBirth (optional), CreatedAt (auto-generated), and a collection of Orders
```

Copilot generates the entity class and its `IEntityTypeConfiguration<Customer>` implementation.

### Migration Assistance

After modifying entities, use Copilot Chat to understand the migration:

```text
What database changes will result from adding the AuditLog entity
to the DbContext? List the SQL statements.
```

### Seed Data Generation

```text
Generate seed data for the Product entity with 20 realistic entries
including varied categories, prices, and descriptions.
```

```csharp
modelBuilder.Entity<Product>().HasData(
    new Product { Id = 1, Name = "Wireless Mouse", Price = 29.99m,
                  Category = "Electronics", Description = "Ergonomic wireless mouse with USB receiver" },
    new Product { Id = 2, Name = "Mechanical Keyboard", Price = 79.99m,
                  Category = "Electronics", Description = "RGB mechanical keyboard with Cherry MX switches" },
    // ... 18 more entries
);
```

---

## Section 5 — Blazor Component Generation

### Generating Components

```text
Create a Blazor component for displaying a paginated data table
with sorting, filtering, and row selection.
```

Copilot generates:

```razor
@page "/products"
@inject IProductService ProductService

<PageTitle>Products</PageTitle>

<div class="d-flex justify-content-between mb-3">
    <input type="text" class="form-control w-25"
           placeholder="Search..."
           @bind-value="searchTerm"
           @bind-value:event="oninput"
           @onkeyup="OnSearch" />
    <button class="btn btn-primary" @onclick="OpenCreateDialog">
        Add Product
    </button>
</div>

<table class="table table-striped table-hover">
    <thead>
        <tr>
            <th @onclick='() => SortBy("Name")'>
                Name @SortIndicator("Name")
            </th>
            <th @onclick='() => SortBy("Price")'>
                Price @SortIndicator("Price")
            </th>
            <th @onclick='() => SortBy("Category")'>
                Category @SortIndicator("Category")
            </th>
        </tr>
    </thead>
    <tbody>
        @foreach (var product in pagedProducts)
        {
            <tr class="@(selectedIds.Contains(product.Id) ? "table-active" : "")"
                @onclick="() => ToggleSelection(product.Id)">
                <td>@product.Name</td>
                <td>@product.Price.ToString("C")</td>
                <td>@product.Category</td>
            </tr>
        }
    </tbody>
</table>

<Pagination CurrentPage="currentPage"
            TotalPages="totalPages"
            OnPageChanged="OnPageChanged" />

@code {
    private List<Product> allProducts = new();
    private List<Product> pagedProducts = new();
    private HashSet<int> selectedIds = new();
    private string searchTerm = "";
    private string sortColumn = "Name";
    private bool sortAscending = true;
    private int currentPage = 1;
    private int pageSize = 10;
    private int totalPages;

    protected override async Task OnInitializedAsync()
    {
        allProducts = await ProductService.GetAllAsync();
        ApplyFiltersAndPaging();
    }

    private void ApplyFiltersAndPaging()
    {
        var filtered = allProducts
            .Where(p => string.IsNullOrEmpty(searchTerm)
                || p.Name.Contains(searchTerm, StringComparison.OrdinalIgnoreCase))
            .ToList();

        totalPages = (int)Math.Ceiling(filtered.Count / (double)pageSize);
        pagedProducts = filtered
            .Skip((currentPage - 1) * pageSize)
            .Take(pageSize)
            .ToList();
    }

    private void SortBy(string column) { /* sort logic */ }
    private void OnSearch() { currentPage = 1; ApplyFiltersAndPaging(); }
    private void OnPageChanged(int page) { currentPage = page; ApplyFiltersAndPaging(); }
    private void ToggleSelection(int id) { /* toggle logic */ }
    private string SortIndicator(string column) =>
        sortColumn == column ? (sortAscending ? "▲" : "▼") : "";
    private void OpenCreateDialog() { /* dialog logic */ }
}
```

---

## Section 6 — Performance Profiling Assistance

### Analyzing Hot Paths

After running the Visual Studio profiler, paste the results into Copilot Chat:

```text
The profiler shows that GetOrdersWithItems takes 340ms per call.
The main bottleneck is the N+1 query pattern in the repository.
How can I optimize this?
```

Copilot suggests eager loading, projection queries, and caching strategies.

### Memory Analysis

```text
The memory snapshot shows 50,000 instances of OrderDto.
These are created during the export operation.
How can I reduce memory pressure?
```

Copilot recommends streaming with `IAsyncEnumerable`, `Span<T>`, and object pooling patterns.

### Benchmark Generation

```text
Generate a BenchmarkDotNet benchmark comparing three approaches
for filtering large collections: LINQ, for loop, and Span-based.
```

---

## Section 7 — NuGet Dependency Management

### Finding the Right Package

```text
What NuGet package should I use for:
- PDF generation in .NET 8
- CSV parsing with high performance
- Circuit breaker pattern for HTTP clients
```

### Upgrading Dependencies

```text
I need to upgrade from Newtonsoft.Json to System.Text.Json.
What breaking changes should I watch for? Generate the migration plan.
```

### Security Audit

```text
Review the NuGet packages in this solution and identify any with
known vulnerabilities or deprecated status.
```

---

## Section 8 — Hands-On Exercise

<Hands0n title="Enterprise Order Management System">

### Goal

Build an order management feature across three projects using Copilot.

### Project Structure

| Project | Purpose |
|---|---|
| `OrderManagement.Api` | ASP.NET Core Web API |
| `OrderManagement.Core` | Domain models and interfaces |
| `OrderManagement.Tests` | xUnit test project |

### Steps

1. **Create the solution** with three projects linked by project references.
2. **Define entities** in Core: `Order`, `OrderItem`, `Customer` with proper relationships.
3. **Generate EF Core configuration** using Copilot for all three entities.
4. **Scaffold the repository** with Copilot: ask for an `IOrderRepository` and implementation.
5. **Build API endpoints** using Minimal API pattern with Copilot.
6. **Generate tests** for the service layer with xUnit and Moq.
7. **Run the profiler** on the GET endpoint and ask Copilot to optimize any N+1 queries.

### Verification

```bash
dotnet build
dotnet test --verbosity normal
dotnet run --project OrderManagement.Api
# Test endpoints with Swagger UI
```

</Hands0n>

---

## Summary

You learned to leverage Copilot's solution-wide context for cross-project refactoring, generated comprehensive tests, worked with EF Core migrations, built Blazor components, used AI for performance optimization, and managed NuGet dependencies. The advanced course covers AI-powered enterprise architecture patterns.
