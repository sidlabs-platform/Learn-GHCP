---
title: "Visual Studio: AI-Powered Enterprise Architecture"
description: "Leverage Copilot for large-scale .NET enterprise applications — microservices, CQRS patterns, and automated architecture."
track: "technology"
difficulty: "advanced"
featureRefs: [copilot-chat, agent-mode, copilot-agents]
personaTags: [architect, developer]
technologyTags: [visual-studio, csharp, dotnet, microservices]
prerequisites: [visual-studio-copilot-intermediate]
estimatedMinutes: 60
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n, Warning } from "@components/course";

## AI-Powered Enterprise Architecture

Large-scale .NET applications demand consistent architecture, reliable messaging, and automated deployment. In this advanced course you will use Copilot to scaffold microservices, implement CQRS and Event Sourcing, generate gRPC service definitions, integrate with Azure services, orchestrate with .NET Aspire, and design multi-project solution architecture.

### What You Will Learn

- Scaffold microservices with consistent architecture using Copilot
- Implement CQRS and Event Sourcing patterns
- Generate gRPC service definitions and implementations
- Integrate with Azure App Service and Azure Functions
- Orchestrate distributed apps with .NET Aspire
- Design multi-project solution architecture
- Complete a capstone: build a distributed e-commerce backend

---

## Section 1 — Microservice Scaffolding

### Generating a Service Template

Use Copilot Chat to generate a complete microservice structure:

```text
Create a .NET 8 microservice template for an Order Service with:
- Clean Architecture layers (API, Application, Domain, Infrastructure)
- MediatR for CQRS
- FluentValidation for input validation
- Serilog for structured logging
- Health checks endpoint
- Docker support
```

### Generated Project Structure

```text
OrderService/
├── OrderService.Api/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Program.cs
│   └── Dockerfile
├── OrderService.Application/
│   ├── Commands/
│   ├── Queries/
│   ├── Validators/
│   └── DependencyInjection.cs
├── OrderService.Domain/
│   ├── Entities/
│   ├── Events/
│   ├── Interfaces/
│   └── ValueObjects/
├── OrderService.Infrastructure/
│   ├── Persistence/
│   ├── Messaging/
│   └── DependencyInjection.cs
└── OrderService.Tests/
```

### Service Registration Pattern

Copilot generates consistent DI registration across services:

```csharp
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(
        this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(
                typeof(DependencyInjection).Assembly));

        services.AddValidatorsFromAssembly(
            typeof(DependencyInjection).Assembly);

        services.AddTransient(
            typeof(IPipelineBehavior<,>),
            typeof(ValidationBehavior<,>));

        services.AddTransient(
            typeof(IPipelineBehavior<,>),
            typeof(LoggingBehavior<,>));

        return services;
    }
}
```

---

## Section 2 — CQRS and Event Sourcing

### Command Pattern

Ask Copilot to generate a complete CQRS command:

```text
Generate a CreateOrder command with MediatR that validates input,
creates the domain entity, persists it, publishes a domain event,
and returns the order ID.
```

```csharp
public record CreateOrderCommand(
    Guid CustomerId,
    List<OrderItemDto> Items,
    string ShippingAddress) : IRequest<Guid>;

public class CreateOrderCommandValidator
    : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Items).NotEmpty()
            .WithMessage("Order must contain at least one item");
        RuleFor(x => x.ShippingAddress).NotEmpty().MaximumLength(500);
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty();
            item.RuleFor(i => i.Quantity).GreaterThan(0);
        });
    }
}

public class CreateOrderCommandHandler
    : IRequestHandler<CreateOrderCommand, Guid>
{
    private readonly IOrderRepository _repository;
    private readonly IPublisher _publisher;

    public CreateOrderCommandHandler(
        IOrderRepository repository,
        IPublisher publisher)
    {
        _repository = repository;
        _publisher = publisher;
    }

    public async Task<Guid> Handle(
        CreateOrderCommand request,
        CancellationToken cancellationToken)
    {
        var order = Order.Create(
            request.CustomerId,
            request.ShippingAddress,
            request.Items.Select(i =>
                new OrderItem(i.ProductId, i.Quantity, i.UnitPrice))
                .ToList());

        await _repository.AddAsync(order, cancellationToken);

        await _publisher.Publish(
            new OrderCreatedEvent(order.Id, order.CustomerId),
            cancellationToken);

        return order.Id;
    }
}
```

### Event Sourcing Store

```csharp
public class EventStore : IEventStore
{
    private readonly EventStoreDbContext _context;

    public EventStore(EventStoreDbContext context)
    {
        _context = context;
    }

    public async Task AppendEventsAsync(
        Guid aggregateId,
        IEnumerable<IDomainEvent> events,
        int expectedVersion,
        CancellationToken cancellationToken = default)
    {
        var currentVersion = await _context.Events
            .Where(e => e.AggregateId == aggregateId)
            .CountAsync(cancellationToken);

        if (currentVersion != expectedVersion)
            throw new ConcurrencyException(aggregateId, expectedVersion, currentVersion);

        var eventEntries = events.Select((e, index) => new StoredEvent
        {
            Id = Guid.NewGuid(),
            AggregateId = aggregateId,
            EventType = e.GetType().AssemblyQualifiedName!,
            EventData = JsonSerializer.Serialize(e, e.GetType()),
            Version = expectedVersion + index + 1,
            Timestamp = DateTimeOffset.UtcNow
        });

        _context.Events.AddRange(eventEntries);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<IDomainEvent>> GetEventsAsync(
        Guid aggregateId,
        CancellationToken cancellationToken = default)
    {
        var storedEvents = await _context.Events
            .Where(e => e.AggregateId == aggregateId)
            .OrderBy(e => e.Version)
            .ToListAsync(cancellationToken);

        return storedEvents
            .Select(e => (IDomainEvent)JsonSerializer.Deserialize(
                e.EventData,
                Type.GetType(e.EventType)!)!)
            .ToList();
    }
}
```

---

## Section 3 — gRPC Service Generation

### Proto File Generation

```text
Generate a gRPC proto file for an Inventory service with methods:
CheckStock, ReserveItems, ReleaseItems, and GetInventoryLevels.
```

```protobuf
syntax = "proto3";

option csharp_namespace = "InventoryService.Grpc";

package inventory;

service Inventory {
  rpc CheckStock (CheckStockRequest) returns (CheckStockResponse);
  rpc ReserveItems (ReserveItemsRequest) returns (ReserveItemsResponse);
  rpc ReleaseItems (ReleaseItemsRequest) returns (ReleaseItemsResponse);
  rpc GetInventoryLevels (GetInventoryLevelsRequest)
      returns (stream InventoryLevel);
}

message CheckStockRequest {
  string product_id = 1;
  int32 quantity = 2;
}

message CheckStockResponse {
  bool is_available = 1;
  int32 available_quantity = 2;
}

message ReserveItemsRequest {
  string order_id = 1;
  repeated ReservationItem items = 2;
}

message ReservationItem {
  string product_id = 1;
  int32 quantity = 2;
}

message ReserveItemsResponse {
  bool success = 1;
  string reservation_id = 2;
  string failure_reason = 3;
}

message ReleaseItemsRequest {
  string reservation_id = 1;
}

message ReleaseItemsResponse {
  bool success = 1;
}

message GetInventoryLevelsRequest {
  repeated string product_ids = 1;
}

message InventoryLevel {
  string product_id = 1;
  int32 quantity = 2;
  string warehouse = 3;
}
```

### Service Implementation

Copilot generates the C# implementation from the proto file:

```csharp
public class InventoryServiceImpl : Inventory.InventoryBase
{
    private readonly IInventoryRepository _repository;
    private readonly ILogger<InventoryServiceImpl> _logger;

    public InventoryServiceImpl(
        IInventoryRepository repository,
        ILogger<InventoryServiceImpl> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public override async Task<CheckStockResponse> CheckStock(
        CheckStockRequest request, ServerCallContext context)
    {
        var level = await _repository.GetStockLevelAsync(
            request.ProductId, context.CancellationToken);

        return new CheckStockResponse
        {
            IsAvailable = level >= request.Quantity,
            AvailableQuantity = level
        };
    }

    public override async Task GetInventoryLevels(
        GetInventoryLevelsRequest request,
        IServerStreamWriter<InventoryLevel> responseStream,
        ServerCallContext context)
    {
        foreach (var productId in request.ProductIds)
        {
            var levels = await _repository.GetWarehouseLevelsAsync(
                productId, context.CancellationToken);

            foreach (var level in levels)
            {
                await responseStream.WriteAsync(new InventoryLevel
                {
                    ProductId = productId,
                    Quantity = level.Quantity,
                    Warehouse = level.WarehouseName
                });
            }
        }
    }
}
```

---

## Section 4 — Azure Integration

### Azure App Service Deployment

```text
Generate the Azure deployment configuration for the Order Service
including App Service, Application Insights, and Key Vault references.
```

```csharp
// Program.cs — Azure-integrated configuration
builder.Configuration.AddAzureKeyVault(
    new Uri(builder.Configuration["KeyVault:Url"]!),
    new DefaultAzureCredential());

builder.Services.AddApplicationInsightsTelemetry();

builder.Services.AddDbContext<OrderDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("OrderDb"),
        sql => sql.EnableRetryOnFailure(3)));

builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("OrderDb")!)
    .AddAzureServiceBusTopic(
        builder.Configuration.GetConnectionString("ServiceBus")!,
        "order-events");
```

### Azure Functions for Event Processing

```csharp
public class OrderEventProcessor
{
    private readonly IMediator _mediator;

    public OrderEventProcessor(IMediator mediator)
    {
        _mediator = mediator;
    }

    [Function("ProcessOrderCreated")]
    public async Task ProcessOrderCreated(
        [ServiceBusTrigger("order-events", "order-created",
            Connection = "ServiceBus")]
        ServiceBusReceivedMessage message,
        FunctionContext context)
    {
        var orderEvent = JsonSerializer.Deserialize<OrderCreatedEvent>(
            message.Body.ToString());

        await _mediator.Send(new ProcessNewOrderCommand(orderEvent!.OrderId));
    }
}
```

---

## Section 5 — .NET Aspire Orchestration

### AppHost Configuration

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var sqlServer = builder.AddSqlServer("sql")
    .AddDatabase("orderdb")
    .AddDatabase("inventorydb");

var redis = builder.AddRedis("cache");

var serviceBus = builder.AddConnectionString("ServiceBus");

var orderService = builder.AddProject<Projects.OrderService_Api>("order-api")
    .WithReference(sqlServer.GetDatabase("orderdb"))
    .WithReference(redis)
    .WithReference(serviceBus);

var inventoryService = builder.AddProject<Projects.InventoryService_Api>("inventory-api")
    .WithReference(sqlServer.GetDatabase("inventorydb"))
    .WithReference(redis);

builder.AddProject<Projects.Gateway_Api>("gateway")
    .WithReference(orderService)
    .WithReference(inventoryService);

builder.Build().Run();
```

### Service Defaults

```csharp
public static class ServiceDefaults
{
    public static IHostApplicationBuilder AddServiceDefaults(
        this IHostApplicationBuilder builder)
    {
        builder.AddDefaultHealthChecks();
        builder.Services.AddServiceDiscovery();
        builder.Services.ConfigureHttpClientDefaults(http =>
        {
            http.AddStandardResilienceHandler();
            http.AddServiceDiscovery();
        });

        return builder;
    }

    public static IHostApplicationBuilder AddDefaultHealthChecks(
        this IHostApplicationBuilder builder)
    {
        builder.Services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy());

        return builder;
    }
}
```

---

## Section 6 — Multi-Project Solution Architecture

### Layered Architecture Template

Ask Copilot to scaffold the full solution:

```text
Generate a solution structure for an e-commerce platform with:
- API Gateway (YARP reverse proxy)
- Order Service (CQRS + Event Sourcing)
- Inventory Service (gRPC)
- Notification Service (background worker)
- Shared Contracts library
- Integration tests project
- Aspire AppHost for orchestration
```

### Cross-Cutting Concerns

Copilot generates shared middleware for all services:

```csharp
public class CorrelationIdMiddleware
{
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next) =>
        _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers["X-Correlation-Id"]
            .FirstOrDefault() ?? Guid.NewGuid().ToString();

        context.Items["CorrelationId"] = correlationId;
        context.Response.Headers["X-Correlation-Id"] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await _next(context);
        }
    }
}
```

### Shared Contracts

```csharp
// In Shared.Contracts project
public record OrderCreatedIntegrationEvent(
    Guid OrderId,
    Guid CustomerId,
    decimal Total,
    DateTimeOffset CreatedAt) : IIntegrationEvent;

public interface IIntegrationEvent
{
    Guid OrderId { get; }
    DateTimeOffset CreatedAt { get; }
}
```

---

## Section 7 — Capstone: Distributed E-Commerce Backend

<Hands0n title="Build a Distributed E-Commerce Backend">

### Goal

Build a distributed e-commerce backend with three microservices orchestrated by .NET Aspire.

### Architecture

| Service | Responsibility | Communication |
|---|---|---|
| Order Service | Order lifecycle, CQRS | REST API, publishes events |
| Inventory Service | Stock management | gRPC, subscribes to events |
| Notification Service | Email/push notifications | Background worker, subscribes to events |

### Implementation Steps

1. **Create the Aspire solution** with AppHost and ServiceDefaults.
2. **Build Order Service** using Clean Architecture and MediatR:
   - `CreateOrderCommand` with validation
   - `GetOrderQuery` with caching
   - Domain events: `OrderCreated`, `OrderShipped`
3. **Build Inventory Service** with gRPC:
   - Proto definition with `CheckStock` and `ReserveItems`
   - Service implementation with repository pattern
4. **Build Notification Service** as a worker:
   - Subscribe to `OrderCreated` events
   - Generate email content with Copilot
5. **Add cross-cutting concerns**:
   - Correlation ID middleware
   - Structured logging with Serilog
   - Health checks for all services
6. **Write integration tests** that verify the full order flow:
   - Create order → stock reserved → notification sent

### Verification

```bash
dotnet build ECommerce.sln
dotnet test --verbosity normal
# Run with Aspire dashboard
dotnet run --project ECommerce.AppHost
# Navigate to the Aspire dashboard to verify all services are running
```

### Evaluation Criteria

- [ ] All three services start and communicate correctly
- [ ] Order creation triggers inventory reservation
- [ ] Domain events are published and consumed
- [ ] gRPC calls between services work with service discovery
- [ ] Health checks pass for all services
- [ ] Integration tests verify the complete flow

</Hands0n>

---

## Summary

You scaffolded microservices, implemented CQRS with Event Sourcing, generated gRPC services, integrated with Azure, orchestrated with .NET Aspire, and designed multi-project architectures — all with Copilot assistance. This completes the Visual Studio + Copilot track.
