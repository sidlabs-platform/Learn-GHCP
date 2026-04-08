---
title: "IntelliJ + Copilot: Spring Boot and Enterprise Java"
description: "Master Copilot for Spring Boot development — service layers, repository patterns, and test generation in IntelliJ."
track: "technology"
difficulty: "intermediate"
featureRefs: [copilot-chat, code-completions, inline-chat]
personaTags: [developer]
technologyTags: [intellij, java, spring-boot, testing]
prerequisites: [intellij-copilot-beginner]
estimatedMinutes: 40
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n, Warning } from "@components/course";

## Enterprise Spring Boot with Copilot

Spring Boot projects follow layered patterns — Controller, Service, Repository — that Copilot excels at generating consistently. This course covers the full Spring Boot stack including JPA entities, JUnit 5 testing with Mockito, Spring Security configuration, API documentation, and IntelliJ refactoring combined with Copilot.

### What You Will Learn

- Generate complete Controller → Service → Repository layers
- Build JPA entities with proper relationship mappings
- Write JUnit 5 tests with Mockito mocks
- Configure Spring Security with Copilot
- Generate API documentation from code
- Combine IntelliJ refactoring tools with Copilot suggestions

---

## Section 1 — The Controller → Service → Repository Pattern

### Generating a Complete Layer Stack

Start with the entity and let Copilot build upward:

```java
// 1. Entity
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String customerName;

    @Column(nullable = false)
    private LocalDateTime orderDate;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL,
               orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    // Copilot generates getters, setters, and helper methods
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
        recalculateTotal();
    }

    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
        recalculateTotal();
    }

    private void recalculateTotal() {
        this.totalAmount = items.stream()
            .map(OrderItem::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
```

```java
// 2. Repository — type the interface and let Copilot add custom queries
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByCustomerNameContainingIgnoreCase(String name);

    List<Order> findByStatusAndOrderDateBetween(
        OrderStatus status, LocalDateTime start, LocalDateTime end);

    @Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.id = :id")
    Optional<Order> findByIdWithItems(@Param("id") Long id);

    @Query("SELECT o.status, COUNT(o) FROM Order o GROUP BY o.status")
    List<Object[]> countByStatus();
}
```

```java
// 3. Service — Copilot generates business logic with proper error handling
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final InventoryClient inventoryClient;
    private final OrderMapper orderMapper;

    public List<OrderDto> findAll(Pageable pageable) {
        return orderRepository.findAll(pageable)
            .map(orderMapper::toDto)
            .getContent();
    }

    public OrderDto findById(Long id) {
        return orderRepository.findByIdWithItems(id)
            .map(orderMapper::toDto)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }

    @Transactional
    public OrderDto createOrder(CreateOrderRequest request) {
        // Validate stock availability
        request.items().forEach(item -> {
            if (!inventoryClient.checkStock(item.productId(), item.quantity())) {
                throw new InsufficientStockException(item.productId());
            }
        });

        var order = orderMapper.toEntity(request);
        order.setStatus(OrderStatus.PENDING);
        order.setOrderDate(LocalDateTime.now());

        var saved = orderRepository.save(order);
        return orderMapper.toDto(saved);
    }

    @Transactional
    public OrderDto updateStatus(Long id, OrderStatus newStatus) {
        var order = orderRepository.findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));

        validateStatusTransition(order.getStatus(), newStatus);
        order.setStatus(newStatus);

        return orderMapper.toDto(orderRepository.save(order));
    }

    private void validateStatusTransition(
            OrderStatus current, OrderStatus next) {
        var validTransitions = Map.of(
            OrderStatus.PENDING, Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.SHIPPED, OrderStatus.CANCELLED),
            OrderStatus.SHIPPED, Set.of(OrderStatus.DELIVERED)
        );

        if (!validTransitions.getOrDefault(current, Set.of()).contains(next)) {
            throw new InvalidStatusTransitionException(current, next);
        }
    }
}
```

```java
// 4. Controller — Copilot maps all endpoints with proper HTTP semantics
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Order management endpoints")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<List<OrderDto>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "orderDate") String sortBy) {
        var pageable = PageRequest.of(page, size, Sort.by(sortBy).descending());
        return ResponseEntity.ok(orderService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderDto> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findById(id));
    }

    @PostMapping
    public ResponseEntity<OrderDto> createOrder(
            @Valid @RequestBody CreateOrderRequest request) {
        var order = orderService.createOrder(request);
        var uri = URI.create("/api/orders/" + order.id());
        return ResponseEntity.created(uri).body(order);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderDto> updateStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        return ResponseEntity.ok(orderService.updateStatus(id, status));
    }
}
```

---

## Section 2 — JPA Entity Generation

### Relationship Mapping

Describe relationships in comments and Copilot generates the mappings:

```java
// Many-to-many relationship between Student and Course
// with an enrollment join table that includes enrollmentDate and grade
@Entity
public class Enrollment {
    @EmbeddedId
    private EnrollmentId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("studentId")
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("courseId")
    private Course course;

    @Column(nullable = false)
    private LocalDate enrollmentDate;

    @Column(length = 2)
    private String grade;
}

@Embeddable
public record EnrollmentId(Long studentId, Long courseId)
    implements Serializable {}
```

### Auditing Support

```java
// Base entity with audit fields
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditableEntity {

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(updatable = false)
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;
}
```

### Specification Queries

```java
// Dynamic query specification for Order filtering
public class OrderSpecifications {

    public static Specification<Order> hasStatus(OrderStatus status) {
        return (root, query, cb) ->
            status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Order> customerNameContains(String name) {
        return (root, query, cb) ->
            name == null ? null :
            cb.like(cb.lower(root.get("customerName")),
                    "%" + name.toLowerCase() + "%");
    }

    public static Specification<Order> createdBetween(
            LocalDateTime start, LocalDateTime end) {
        return (root, query, cb) -> {
            if (start == null && end == null) return null;
            if (start != null && end != null)
                return cb.between(root.get("orderDate"), start, end);
            if (start != null)
                return cb.greaterThanOrEqualTo(root.get("orderDate"), start);
            return cb.lessThanOrEqualTo(root.get("orderDate"), end);
        };
    }

    public static Specification<Order> withFilters(OrderFilterRequest filter) {
        return Specification
            .where(hasStatus(filter.status()))
            .and(customerNameContains(filter.customerName()))
            .and(createdBetween(filter.startDate(), filter.endDate()));
    }
}
```

---

## Section 3 — JUnit 5 + Mockito Test Generation

### Service Layer Tests

Use Chat to generate comprehensive tests:

```text
Generate JUnit 5 tests for OrderService with Mockito.
Cover createOrder success, createOrder with insufficient stock,
findById success, findById not found, and status transition validation.
```

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private InventoryClient inventoryClient;
    @Mock private OrderMapper orderMapper;
    @InjectMocks private OrderService orderService;

    @Test
    @DisplayName("createOrder succeeds when stock is available")
    void createOrder_WithAvailableStock_ReturnsOrder() {
        // Arrange
        var request = new CreateOrderRequest(
            "Alice",
            List.of(new OrderItemRequest(1L, 2, BigDecimal.TEN))
        );
        var entity = new Order();
        entity.setId(1L);
        var expectedDto = new OrderDto(1L, "Alice", OrderStatus.PENDING,
            BigDecimal.valueOf(20), List.of());

        when(inventoryClient.checkStock(1L, 2)).thenReturn(true);
        when(orderMapper.toEntity(request)).thenReturn(entity);
        when(orderRepository.save(any(Order.class))).thenReturn(entity);
        when(orderMapper.toDto(entity)).thenReturn(expectedDto);

        // Act
        var result = orderService.createOrder(request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(1L);
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    @DisplayName("createOrder throws when stock is insufficient")
    void createOrder_WithInsufficientStock_ThrowsException() {
        var request = new CreateOrderRequest(
            "Bob",
            List.of(new OrderItemRequest(1L, 100, BigDecimal.TEN))
        );
        when(inventoryClient.checkStock(1L, 100)).thenReturn(false);

        assertThatThrownBy(() -> orderService.createOrder(request))
            .isInstanceOf(InsufficientStockException.class);

        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("findById returns order when found")
    void findById_WithExistingId_ReturnsOrder() {
        var entity = new Order();
        entity.setId(1L);
        var dto = new OrderDto(1L, "Alice", OrderStatus.PENDING,
            BigDecimal.TEN, List.of());

        when(orderRepository.findByIdWithItems(1L))
            .thenReturn(Optional.of(entity));
        when(orderMapper.toDto(entity)).thenReturn(dto);

        var result = orderService.findById(1L);

        assertThat(result.id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("findById throws when not found")
    void findById_WithMissingId_ThrowsNotFoundException() {
        when(orderRepository.findByIdWithItems(999L))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.findById(999L))
            .isInstanceOf(OrderNotFoundException.class);
    }

    @ParameterizedTest
    @CsvSource({
        "PENDING, CONFIRMED, true",
        "PENDING, SHIPPED, false",
        "CONFIRMED, SHIPPED, true",
        "SHIPPED, DELIVERED, true",
        "DELIVERED, PENDING, false"
    })
    @DisplayName("status transitions are validated correctly")
    void updateStatus_ValidatesTransitions(
            OrderStatus current, OrderStatus next, boolean valid) {
        var entity = new Order();
        entity.setId(1L);
        entity.setStatus(current);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(entity));
        if (valid) {
            when(orderRepository.save(any())).thenReturn(entity);
            when(orderMapper.toDto(any())).thenReturn(
                new OrderDto(1L, "test", next, BigDecimal.ZERO, List.of()));
        }

        if (valid) {
            assertThatCode(() -> orderService.updateStatus(1L, next))
                .doesNotThrowAnyException();
        } else {
            assertThatThrownBy(() -> orderService.updateStatus(1L, next))
                .isInstanceOf(InvalidStatusTransitionException.class);
        }
    }
}
```

### Controller Tests with MockMvc

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private OrderService orderService;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void getOrderById_ReturnsOrder() throws Exception {
        var dto = new OrderDto(1L, "Alice", OrderStatus.PENDING,
            BigDecimal.TEN, List.of());
        when(orderService.findById(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/orders/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.customerName").value("Alice"));
    }

    @Test
    void createOrder_WithValidRequest_Returns201() throws Exception {
        var request = new CreateOrderRequest("Alice",
            List.of(new OrderItemRequest(1L, 2, BigDecimal.TEN)));
        var dto = new OrderDto(1L, "Alice", OrderStatus.PENDING,
            BigDecimal.valueOf(20), List.of());

        when(orderService.createOrder(any())).thenReturn(dto);

        mockMvc.perform(post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.id").value(1));
    }
}
```

---

## Section 4 — Spring Security Configuration

### Generating Security Config

```text
Generate Spring Security configuration with:
- JWT authentication filter
- Role-based access control (ADMIN, USER)
- Public endpoints for health and Swagger
- CORS configuration for localhost:3000
```

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http)
            throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/v3/api-docs/**",
                    "/swagger-ui/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter,
                UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

---

## Section 5 — API Documentation

### OpenAPI Annotations

Copilot generates OpenAPI annotations for controllers:

```java
@Operation(summary = "Create a new order",
    description = "Creates an order after validating stock availability")
@ApiResponses({
    @ApiResponse(responseCode = "201", description = "Order created",
        content = @Content(schema = @Schema(implementation = OrderDto.class))),
    @ApiResponse(responseCode = "400", description = "Invalid request"),
    @ApiResponse(responseCode = "409", description = "Insufficient stock")
})
@PostMapping
public ResponseEntity<OrderDto> createOrder(
    @Valid @RequestBody CreateOrderRequest request) {
    // ...
}
```

### Generating an OpenAPI Configuration Bean

```java
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenApi() {
        return new OpenAPI()
            .info(new Info()
                .title("Order Management API")
                .version("1.0.0")
                .description("API for managing orders"))
            .addSecurityItem(new SecurityRequirement()
                .addList("Bearer Authentication"))
            .components(new Components()
                .addSecuritySchemes("Bearer Authentication",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
```

---

## Section 6 — IntelliJ Refactoring + Copilot

### Combined Workflow

Use IntelliJ's structural refactoring first, then Copilot for logic changes:

| Step | Tool | Action |
|---|---|---|
| Rename class | IntelliJ (`Shift+F6`) | Updates all references safely |
| Extract interface | IntelliJ (`Ctrl+Shift+F6`) | Generates interface from class |
| Update implementations | Copilot Chat | Adjusts business logic |
| Generate tests for new interface | Copilot Chat | Creates mock-based tests |

### Example: Extracting a Strategy

1. **IntelliJ:** Extract the `calculateDiscount` method to an interface `DiscountStrategy`.
2. **Copilot:** "Generate three implementations — FlatDiscount, PercentageDiscount, and TieredDiscount."
3. **IntelliJ:** Use **Change Signature** to inject `DiscountStrategy` via constructor.
4. **Copilot:** "Update the test class to parameterize over all three strategies."

---

## Section 7 — Hands-On Exercise

<Hands0n title="Build a Complete Order Management API">

### Goal

Build a production-ready Order Management API with full test coverage using Copilot.

### Requirements

1. **Entity layer:** `Order`, `OrderItem`, `Customer` with JPA mappings.
2. **Repository layer:** Spring Data JPA with custom queries and specifications.
3. **Service layer:** Business logic with validation and status transitions.
4. **Controller layer:** REST endpoints with pagination, sorting, and filtering.
5. **Security:** JWT authentication with role-based access.
6. **Tests:** At least 15 test methods covering service and controller layers.
7. **Documentation:** OpenAPI annotations on all endpoints.

### Verification

```bash
./mvnw test
# Expect all tests to pass

./mvnw spring-boot:run
# Navigate to http://localhost:8080/swagger-ui.html
# Verify all endpoints are documented
```

</Hands0n>

---

## Summary

You mastered the Controller → Service → Repository pattern with Copilot, generated JPA entities with complex relationships, wrote comprehensive tests with JUnit 5 and Mockito, configured Spring Security, generated API documentation, and combined IntelliJ refactoring with AI assistance. The advanced course covers microservices architecture.
