---
title: "Eclipse + Copilot: Enterprise Java Patterns"
description: "Use Copilot in Eclipse for enterprise Java development with Jakarta EE, JUnit testing, and legacy code modernization."
track: "technology"
difficulty: "intermediate"
featureRefs: [copilot-chat, code-completions]
personaTags: [developer]
technologyTags: [eclipse, java, jakarta-ee, testing]
prerequisites: [eclipse-copilot-beginner]
estimatedMinutes: 35
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n, Warning } from "@components/course";

## Enterprise Java Patterns with Copilot in Eclipse

Eclipse remains a primary IDE for enterprise Java development, especially in organizations using Jakarta EE, legacy codebases, and established tooling. This course covers Jakarta EE patterns, JUnit test generation, modernizing legacy Java code, combining Eclipse refactoring tools with Copilot, and AI-assisted debugging.

### What You Will Learn

- Generate Jakarta EE components with Copilot
- Write JUnit 5 tests with comprehensive coverage
- Modernize legacy Java code from Java 8 to Java 21
- Combine Eclipse's refactoring engine with Copilot suggestions
- Debug complex issues with AI assistance

---

## Section 1 — Jakarta EE Patterns

### CDI Beans

Generate CDI-managed beans with proper scoping:

```java
@ApplicationScoped
public class OrderService {

    @Inject
    private OrderRepository orderRepository;

    @Inject
    private InventoryClient inventoryClient;

    @Inject
    private Event<OrderCreatedEvent> orderCreatedEvent;

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        validateRequest(request);

        var order = new Order();
        order.setCustomerEmail(request.getCustomerEmail());
        order.setOrderDate(LocalDateTime.now());
        order.setStatus(OrderStatus.PENDING);

        request.getItems().forEach(item -> {
            var available = inventoryClient.checkAvailability(
                item.getProductId(), item.getQuantity());
            if (!available) {
                throw new InsufficientStockException(item.getProductId());
            }
            order.addItem(new OrderItem(
                item.getProductId(),
                item.getQuantity(),
                item.getUnitPrice()));
        });

        orderRepository.persist(order);
        orderCreatedEvent.fire(new OrderCreatedEvent(order.getId()));

        return order;
    }

    private void validateRequest(CreateOrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ValidationException("Order must have at least one item");
        }
    }
}
```

### JAX-RS Endpoints

```java
@Path("/api/orders")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequestScoped
public class OrderResource {

    @Inject
    private OrderService orderService;

    @GET
    public Response getAllOrders(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        var orders = orderService.findAll(page, size);
        return Response.ok(orders).build();
    }

    @GET
    @Path("/{id}")
    public Response getOrderById(@PathParam("id") Long id) {
        return orderService.findById(id)
            .map(order -> Response.ok(order).build())
            .orElse(Response.status(Response.Status.NOT_FOUND).build());
    }

    @POST
    public Response createOrder(
            @Valid CreateOrderRequest request) {
        var order = orderService.createOrder(request);
        var uri = UriBuilder.fromResource(OrderResource.class)
            .path("{id}").build(order.getId());
        return Response.created(uri).entity(order).build();
    }

    @PUT
    @Path("/{id}/status")
    public Response updateStatus(
            @PathParam("id") Long id,
            @QueryParam("status") OrderStatus status) {
        orderService.updateStatus(id, status);
        return Response.noContent().build();
    }
}
```

### JPA Repository Pattern

```java
@ApplicationScoped
public class OrderRepository {

    @PersistenceContext
    private EntityManager em;

    public Optional<Order> findById(Long id) {
        return Optional.ofNullable(em.find(Order.class, id));
    }

    public List<Order> findAll(int page, int size) {
        return em.createQuery(
                "SELECT o FROM Order o ORDER BY o.orderDate DESC",
                Order.class)
            .setFirstResult(page * size)
            .setMaxResults(size)
            .getResultList();
    }

    public List<Order> findByStatus(OrderStatus status) {
        return em.createQuery(
                "SELECT o FROM Order o WHERE o.status = :status",
                Order.class)
            .setParameter("status", status)
            .getResultList();
    }

    @Transactional
    public void persist(Order order) {
        em.persist(order);
    }

    @Transactional
    public Order merge(Order order) {
        return em.merge(order);
    }

    public long count() {
        return em.createQuery("SELECT COUNT(o) FROM Order o", Long.class)
            .getSingleResult();
    }
}
```

### Bean Validation

```java
public class CreateOrderRequest {

    @NotBlank(message = "Customer email is required")
    @Email(message = "Invalid email format")
    private String customerEmail;

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<OrderItemRequest> items;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;
}

public class OrderItemRequest {

    @NotNull(message = "Product ID is required")
    @Positive(message = "Product ID must be positive")
    private Long productId;

    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 999, message = "Quantity cannot exceed 999")
    private int quantity;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.01", message = "Price must be positive")
    private BigDecimal unitPrice;
}
```

---

## Section 2 — JUnit Test Generation

### Generating Tests with Chat

Select the `OrderService` class and ask Chat:

```text
Generate JUnit 5 tests for OrderService.
Use Mockito for mocking dependencies.
Cover: createOrder success, validation failure,
insufficient stock, and findAll with pagination.
```

### Generated Tests

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @InjectMocks private OrderService orderService;
    @Mock private OrderRepository orderRepository;
    @Mock private InventoryClient inventoryClient;
    @Mock private Event<OrderCreatedEvent> orderCreatedEvent;

    @Test
    @DisplayName("createOrder succeeds with valid request and available stock")
    void createOrder_ValidRequest_Success() {
        // Arrange
        var itemRequest = new OrderItemRequest();
        itemRequest.setProductId(1L);
        itemRequest.setQuantity(2);
        itemRequest.setUnitPrice(BigDecimal.valueOf(25.00));

        var request = new CreateOrderRequest();
        request.setCustomerEmail("test@example.com");
        request.setItems(List.of(itemRequest));

        when(inventoryClient.checkAvailability(1L, 2)).thenReturn(true);

        // Act
        var result = orderService.createOrder(request);

        // Assert
        assertNotNull(result);
        assertEquals(OrderStatus.PENDING, result.getStatus());
        assertEquals("test@example.com", result.getCustomerEmail());
        assertEquals(1, result.getItems().size());
        verify(orderRepository).persist(any(Order.class));
        verify(orderCreatedEvent).fire(any(OrderCreatedEvent.class));
    }

    @Test
    @DisplayName("createOrder throws ValidationException for empty items")
    void createOrder_EmptyItems_ThrowsValidation() {
        var request = new CreateOrderRequest();
        request.setCustomerEmail("test@example.com");
        request.setItems(Collections.emptyList());

        assertThrows(ValidationException.class,
            () -> orderService.createOrder(request));
        verify(orderRepository, never()).persist(any());
    }

    @Test
    @DisplayName("createOrder throws InsufficientStockException when stock unavailable")
    void createOrder_InsufficientStock_Throws() {
        var itemRequest = new OrderItemRequest();
        itemRequest.setProductId(1L);
        itemRequest.setQuantity(100);
        itemRequest.setUnitPrice(BigDecimal.TEN);

        var request = new CreateOrderRequest();
        request.setCustomerEmail("test@example.com");
        request.setItems(List.of(itemRequest));

        when(inventoryClient.checkAvailability(1L, 100)).thenReturn(false);

        assertThrows(InsufficientStockException.class,
            () -> orderService.createOrder(request));
    }

    @Test
    @DisplayName("findAll returns paginated results")
    void findAll_ReturnsPaginatedOrders() {
        var orders = List.of(new Order(), new Order());
        when(orderRepository.findAll(0, 10)).thenReturn(orders);

        var result = orderService.findAll(0, 10);

        assertEquals(2, result.size());
        verify(orderRepository).findAll(0, 10);
    }
}
```

### Test Coverage Analysis

After running tests, use Chat to identify coverage gaps:

```text
Looking at the OrderService class, what test scenarios
am I missing? Consider edge cases, boundary values,
and error conditions.
```

Copilot might suggest:

- Testing with null customer email
- Testing maximum quantity boundaries
- Testing concurrent order creation
- Testing order status transition validation

---

## Section 3 — Legacy Java Modernization (Java 8 → 21)

### Anonymous Classes to Lambdas

**Before (Java 7 style):**

```java
Collections.sort(users, new Comparator<User>() {
    @Override
    public int compare(User u1, User u2) {
        return u1.getName().compareTo(u2.getName());
    }
});
```

**After (ask Copilot to modernize):**

```java
users.sort(Comparator.comparing(User::getName));
```

### Null Handling with Optional

**Before:**

```java
public String getUserCity(User user) {
    if (user != null) {
        Address address = user.getAddress();
        if (address != null) {
            City city = address.getCity();
            if (city != null) {
                return city.getName();
            }
        }
    }
    return "Unknown";
}
```

**After:**

```java
public String getUserCity(User user) {
    return Optional.ofNullable(user)
        .map(User::getAddress)
        .map(Address::getCity)
        .map(City::getName)
        .orElse("Unknown");
}
```

### Stream API Conversions

**Before:**

```java
List<String> activeUserNames = new ArrayList<>();
for (User user : users) {
    if (user.isActive()) {
        activeUserNames.add(user.getName().toUpperCase());
    }
}
```

**After:**

```java
var activeUserNames = users.stream()
    .filter(User::isActive)
    .map(User::getName)
    .map(String::toUpperCase)
    .toList();
```

### Record Conversion

**Before:**

```java
public class ProductDto {
    private final Long id;
    private final String name;
    private final BigDecimal price;

    public ProductDto(Long id, String name, BigDecimal price) {
        this.id = id;
        this.name = name;
        this.price = price;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public BigDecimal getPrice() { return price; }

    @Override
    public boolean equals(Object o) { /* ... */ }

    @Override
    public int hashCode() { /* ... */ }

    @Override
    public String toString() { /* ... */ }
}
```

**After:**

```java
public record ProductDto(Long id, String name, BigDecimal price) {}
```

### Text Blocks

**Before:**

```java
String sql = "SELECT u.id, u.name, u.email " +
    "FROM users u " +
    "JOIN orders o ON u.id = o.user_id " +
    "WHERE o.status = 'ACTIVE' " +
    "ORDER BY u.name";
```

**After:**

```java
var sql = """
    SELECT u.id, u.name, u.email
    FROM users u
    JOIN orders o ON u.id = o.user_id
    WHERE o.status = 'ACTIVE'
    ORDER BY u.name
    """;
```

### Pattern Matching

**Before:**

```java
if (shape instanceof Circle) {
    Circle c = (Circle) shape;
    return Math.PI * c.getRadius() * c.getRadius();
} else if (shape instanceof Rectangle) {
    Rectangle r = (Rectangle) shape;
    return r.getWidth() * r.getHeight();
}
```

**After:**

```java
return switch (shape) {
    case Circle c -> Math.PI * c.getRadius() * c.getRadius();
    case Rectangle r -> r.getWidth() * r.getHeight();
    case Triangle t -> 0.5 * t.getBase() * t.getHeight();
    default -> throw new IllegalArgumentException("Unknown shape");
};
```

### Batch Modernization with Chat

```text
Modernize this entire class from Java 8 style to Java 21.
Use records, text blocks, pattern matching, var, and stream API.
Keep the same public API but update the implementation.
```

---

## Section 4 — Eclipse Refactoring + Copilot

### Combined Workflow

Eclipse's refactoring engine ensures type-safe structural changes. Copilot excels at logic transformation.

| Task | Best Tool | Why |
|---|---|---|
| Rename symbol | Eclipse (`Alt+Shift+R`) | Updates all references safely |
| Extract method | Eclipse (`Alt+Shift+M`) | Handles scope and parameters |
| Move class | Eclipse (`Alt+Shift+V`) | Updates imports and packages |
| Change implementation logic | Copilot | Understands intent from description |
| Generate new pattern | Copilot | Creates code from scratch |
| Convert to new Java syntax | Copilot | Batch modernization |

### Example: Refactoring to Strategy Pattern

1. **Eclipse:** Extract the pricing logic into a separate method (`Alt+Shift+M`).
2. **Eclipse:** Extract an interface from the method (`Refactor → Extract Interface`).
3. **Copilot:** "Generate three implementations of PricingStrategy: StandardPricing, VolumePricing, and PromotionalPricing."
4. **Eclipse:** Use **Change Method Signature** to inject the strategy.
5. **Copilot:** "Generate a factory that selects the pricing strategy based on customer tier."

### Quick Fixes Enhanced by Copilot

Eclipse's quick fix (`Ctrl+1`) handles compilation errors. For logical errors, use Copilot:

```text
This method works but is O(n²) due to nested loops.
Refactor it to O(n) using a HashMap.
```

---

## Section 5 — AI-Assisted Debugging

### Understanding Stack Traces

Paste a stack trace into Chat:

```text
java.lang.NullPointerException
  at com.example.OrderService.processOrder(OrderService.java:45)
  at com.example.OrderController.create(OrderController.java:28)

The order object is retrieved from the database.
What could cause this NPE and how should I handle it?
```

Copilot analyzes the trace and suggests defensive coding patterns.

### Diagnosing Performance Issues

```text
This method takes 3 seconds for 1000 records.
It calls the database inside a for loop.
How can I batch the database calls?
```

Copilot suggests batch fetching with `WHERE IN` clauses and entity graphs.

### Concurrent Bug Analysis

```text
This HashMap is accessed from multiple threads and occasionally
throws ConcurrentModificationException. What's the best fix
that maintains performance?
```

Copilot recommends `ConcurrentHashMap`, explains the tradeoffs, and generates the migration.

---

## Section 6 — Hands-On Exercise

<Hands0n title="Modernize and Test a Legacy Service">

### Goal

Take a legacy Java service class and modernize it with Copilot, then add comprehensive tests.

### Starting Code

Create a `LegacyUserService.java` with intentionally old-style Java code:

```java
public class LegacyUserService {
    private List<User> users = new ArrayList<>();

    public User findUserByEmail(String email) {
        for (int i = 0; i < users.size(); i++) {
            if (users.get(i).getEmail().equals(email)) {
                return users.get(i);
            }
        }
        return null;
    }

    public List<String> getActiveUserEmails() {
        List<String> emails = new ArrayList<>();
        for (User user : users) {
            if (user.isActive() == true) {
                emails.add(user.getEmail());
            }
        }
        Collections.sort(emails);
        return emails;
    }

    public Map<String, List<User>> groupByDepartment() {
        Map<String, List<User>> groups = new HashMap<>();
        for (User user : users) {
            String dept = user.getDepartment();
            if (!groups.containsKey(dept)) {
                groups.put(dept, new ArrayList<>());
            }
            groups.get(dept).add(user);
        }
        return groups;
    }
}
```

### Steps

1. **Modernize** the class using Copilot Chat: "Modernize this class to Java 21 with Optional, streams, records, and var."
2. **Add null safety** using Copilot: "Add proper null handling to all methods."
3. **Generate tests** using Chat: "Generate JUnit 5 tests for all three methods including edge cases."
4. **Add a new method** using ghost text: Type `// Find the user with the highest login count in each department`.
5. **Run all tests** and verify they pass.

### Verification

```bash
mvn test -Dtest=LegacyUserServiceTest
# All tests should pass
```

</Hands0n>

---

## Summary

You generated Jakarta EE components, wrote comprehensive JUnit tests, modernized legacy Java code from Java 8 to Java 21, combined Eclipse refactoring with Copilot suggestions, and used AI-assisted debugging. The advanced course covers large-scale legacy modernization strategies.
