---
title: "Eclipse: Legacy Java Modernization with AI"
description: "Modernize enterprise Java applications in Eclipse using Copilot for migration planning, code transformation, and testing."
track: "technology"
difficulty: "advanced"
featureRefs: [copilot-chat, agent-mode, copilot-agents]
personaTags: [architect, developer]
technologyTags: [eclipse, java, legacy, migration]
prerequisites: [eclipse-copilot-intermediate]
estimatedMinutes: 60
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n, Warning } from "@components/course";

## Legacy Java Modernization with AI

Enterprise organizations maintain Java applications that have evolved over decades. Modernizing these systems — from Java EE to Jakarta EE, from monoliths to modular architectures, from manual testing to automated suites — is a massive undertaking. Copilot accelerates this work by generating migration plans, transforming code patterns, writing tests for untested legacy code, and scaffolding modern replacements.

### What You Will Learn

- Develop a legacy modernization strategy with AI assistance
- Migrate Java EE applications to Jakarta EE
- Decompose monolithic applications into modules
- Apply automated code transformation patterns
- Write tests for legacy code that has no existing test coverage
- Complete a capstone: modernize a legacy Java application

---

## Section 1 — Legacy Modernization Strategy

### Assessing a Legacy Codebase

Use Copilot Chat to analyze and plan:

```text
I have a Java EE 7 application with:
- 200,000 lines of Java code
- JSF 2.2 frontend with PrimeFaces
- EJB 3.2 session beans
- JPA 2.1 with Hibernate
- JMS for messaging
- No unit tests
- Java 8 runtime

Create a phased modernization plan with effort estimates
for each phase.
```

Copilot generates a structured migration plan:

### Phased Migration Plan

| Phase | Description | Effort | Risk |
|---|---|---|---|
| 1. Foundation | Upgrade to Java 17+, add build tooling | 2-4 weeks | Low |
| 2. Testing | Add tests to critical paths before changes | 4-8 weeks | Low |
| 3. Namespace Migration | Java EE → Jakarta EE namespace | 2-3 weeks | Medium |
| 4. Framework Update | EJB → CDI, JSF → modern frontend | 8-16 weeks | High |
| 5. Architecture | Decompose into modules/services | 12-24 weeks | High |
| 6. Infrastructure | Containerize and add CI/CD | 4-8 weeks | Medium |

### Dependency Analysis

Ask Copilot to audit your dependencies:

```text
Review this pom.xml and identify:
1. Deprecated dependencies that need replacement
2. Security vulnerabilities in the current versions
3. Jakarta EE equivalents for each Java EE dependency
4. Recommended upgrade path with version numbers
```

### Risk Assessment

```text
Analyze the risks of migrating this EJB-heavy application to CDI.
Consider: transaction management, timer services, remote interfaces,
security annotations, and interceptors.
What are the breaking changes I should plan for?
```

---

## Section 2 — Java EE → Jakarta EE Migration

### Namespace Migration

The most mechanical part of the migration is changing `javax.*` packages to `jakarta.*`.

**Before:**

```java
import javax.persistence.Entity;
import javax.persistence.Table;
import javax.persistence.Id;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.validation.constraints.NotNull;
import javax.ws.rs.Path;
import javax.ws.rs.GET;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
```

**After:**

```java
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
```

### Automating Namespace Migration

Use Chat to generate a migration script:

```text
Generate a bash script that recursively finds all .java files
and replaces javax.persistence with jakarta.persistence,
javax.validation with jakarta.validation,
javax.ws.rs with jakarta.ws.rs,
javax.inject with jakarta.inject,
javax.enterprise with jakarta.enterprise,
and javax.servlet with jakarta.servlet.
Include a dry-run mode and backup option.
```

```bash
#!/bin/bash
set -euo pipefail

DRY_RUN=false
BACKUP=true

while getopts "nb" opt; do
    case $opt in
        n) DRY_RUN=true ;;
        b) BACKUP=false ;;
    esac
done

REPLACEMENTS=(
    "javax.persistence:jakarta.persistence"
    "javax.validation:jakarta.validation"
    "javax.ws.rs:jakarta.ws.rs"
    "javax.inject:jakarta.inject"
    "javax.enterprise:jakarta.enterprise"
    "javax.servlet:jakarta.servlet"
    "javax.annotation:jakarta.annotation"
    "javax.transaction:jakarta.transaction"
)

find src -name "*.java" | while read -r file; do
    changed=false
    for replacement in "${REPLACEMENTS[@]}"; do
        old="${replacement%%:*}"
        new="${replacement##*:}"
        if grep -q "$old" "$file"; then
            changed=true
            if [ "$DRY_RUN" = true ]; then
                echo "[DRY RUN] $file: $old → $new"
            else
                if [ "$BACKUP" = true ]; then
                    cp "$file" "$file.bak"
                fi
                sed -i "s/$old/$new/g" "$file"
                echo "Updated $file: $old → $new"
            fi
        fi
    done
done

echo "Migration complete."
```

### POM Dependency Migration

```xml
<!-- Before: Java EE 7 -->
<dependency>
    <groupId>javax</groupId>
    <artifactId>javaee-api</artifactId>
    <version>7.0</version>
    <scope>provided</scope>
</dependency>

<!-- After: Jakarta EE 10 -->
<dependency>
    <groupId>jakarta.platform</groupId>
    <artifactId>jakarta.jakartaee-api</artifactId>
    <version>10.0.0</version>
    <scope>provided</scope>
</dependency>
```

---

## Section 3 — EJB to CDI Migration

### Stateless Session Bean

**Before (EJB):**

```java
@Stateless
public class OrderProcessorBean {

    @PersistenceContext
    private EntityManager em;

    @Resource
    private SessionContext ctx;

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void processOrder(Long orderId) {
        Order order = em.find(Order.class, orderId);
        if (order == null) {
            ctx.setRollbackOnly();
            throw new EJBException("Order not found: " + orderId);
        }
        order.setStatus(OrderStatus.PROCESSING);
        em.merge(order);
    }
}
```

**After (CDI):**

```java
@ApplicationScoped
@Transactional
public class OrderProcessor {

    @Inject
    private EntityManager em;

    public void processOrder(Long orderId) {
        var order = Optional.ofNullable(em.find(Order.class, orderId))
            .orElseThrow(() ->
                new OrderNotFoundException("Order not found: " + orderId));
        order.setStatus(OrderStatus.PROCESSING);
        em.merge(order);
    }
}
```

### Timer Service Migration

**Before (EJB Timer):**

```java
@Stateless
public class ReportGeneratorBean {

    @Schedule(hour = "2", minute = "0", persistent = false)
    public void generateDailyReport() {
        // report generation logic
    }
}
```

**After (using a scheduler):**

```java
@ApplicationScoped
public class ReportGenerator {

    @Inject
    private ReportService reportService;

    @Scheduled(cron = "0 0 2 * * ?")
    public void generateDailyReport() {
        reportService.generateAndStore();
    }
}
```

### Remote Interface Migration

Use Chat to plan the migration:

```text
This application has 15 EJB remote interfaces used for
inter-service communication. What are my options for
replacing them? Consider REST, gRPC, and messaging.
Generate a comparison table and recommendation.
```

| Approach | Latency | Complexity | Type Safety | Best For |
|---|---|---|---|---|
| REST (JAX-RS) | Medium | Low | Medium | External APIs |
| gRPC | Low | Medium | High | Internal service-to-service |
| Kafka/JMS | Async | Medium | Medium | Event-driven flows |
| Direct CDI (same JVM) | Lowest | Lowest | High | Same deployment unit |

---

## Section 4 — Monolith Decomposition

### Identifying Module Boundaries

```text
Analyze this package structure and suggest module boundaries
for decomposition. Consider domain coupling, data ownership,
and deployment independence:

com.example.erp
├── order/
├── inventory/
├── customer/
├── billing/
├── shipping/
├── reporting/
├── notification/
└── common/
```

### Dependency Analysis

Ask Copilot to identify coupling between packages:

```text
Generate a dependency analysis for these packages.
Which packages have circular dependencies?
Which can be extracted independently?
```

### Module Extraction Strategy

```java
// Step 1: Define module interfaces in the shared module
public interface OrderFacade {
    OrderDto createOrder(CreateOrderRequest request);
    Optional<OrderDto> findById(Long id);
    List<OrderDto> findByCustomer(Long customerId);
    void updateStatus(Long orderId, OrderStatus status);
}

// Step 2: Implement in the order module
@ApplicationScoped
public class OrderFacadeImpl implements OrderFacade {

    @Inject private OrderService orderService;
    @Inject private OrderMapper mapper;

    @Override
    @Transactional
    public OrderDto createOrder(CreateOrderRequest request) {
        var order = orderService.create(request);
        return mapper.toDto(order);
    }

    @Override
    public Optional<OrderDto> findById(Long id) {
        return orderService.findById(id).map(mapper::toDto);
    }

    @Override
    public List<OrderDto> findByCustomer(Long customerId) {
        return orderService.findByCustomer(customerId).stream()
            .map(mapper::toDto)
            .toList();
    }

    @Override
    @Transactional
    public void updateStatus(Long orderId, OrderStatus status) {
        orderService.updateStatus(orderId, status);
    }
}

// Step 3: Other modules depend on the interface, not the implementation
@ApplicationScoped
public class ShippingService {

    @Inject private OrderFacade orderFacade;

    public void shipOrder(Long orderId) {
        var order = orderFacade.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
        // shipping logic
        orderFacade.updateStatus(orderId, OrderStatus.SHIPPED);
    }
}
```

### Database Decomposition

```text
The monolith uses a single database with 85 tables.
The order module uses 12 tables, inventory uses 8,
and customer uses 6. Some tables are shared.
Generate a strategy for splitting the database
with a transition period where both schemas coexist.
```

---

## Section 5 — Automated Code Transformation Patterns

### Generating Transformation Rules

Use Chat to create reusable transformations:

```text
Generate a list of automated code transformations to apply
across the entire codebase. Each transformation should have:
a before/after example, the regex or AST pattern, and
a description of what it modernizes.
```

### Common Transformations

**1. String concatenation to String.format or template:**

```java
// Before
String msg = "Order " + orderId + " for customer " + customerId + " created at " + date;

// After
var msg = "Order %d for customer %d created at %s".formatted(orderId, customerId, date);
```

**2. Try-with-resources:**

```java
// Before
Connection conn = null;
try {
    conn = dataSource.getConnection();
    // use connection
} finally {
    if (conn != null) {
        conn.close();
    }
}

// After
try (var conn = dataSource.getConnection()) {
    // use connection
}
```

**3. Collection initialization:**

```java
// Before
List<String> items = new ArrayList<>();
items.add("one");
items.add("two");
items.add("three");

// After
var items = List.of("one", "two", "three");
```

**4. Map iteration:**

```java
// Before
Iterator<Map.Entry<String, Integer>> it = map.entrySet().iterator();
while (it.hasNext()) {
    Map.Entry<String, Integer> entry = it.next();
    System.out.println(entry.getKey() + ": " + entry.getValue());
}

// After
map.forEach((key, value) ->
    System.out.println(key + ": " + value));
```

---

## Section 6 — Testing Legacy Code

### Writing Tests for Code Without Tests

The biggest challenge in legacy modernization is adding tests to code that was never designed to be testable.

### Seam Identification

Ask Copilot to find testable seams:

```text
This legacy class has no interfaces, uses static methods,
and creates its own database connections. Identify the
minimal changes needed to make it testable without
changing the public API.
```

### Extract and Override Pattern

```java
// Original — hard to test because it creates its own connection
public class LegacyOrderDao {
    public Order findById(Long id) {
        Connection conn = DriverManager.getConnection(DB_URL);
        // query logic
    }
}

// Refactored — connection creation is overridable
public class LegacyOrderDao {
    public Order findById(Long id) {
        try (var conn = createConnection()) {
            // query logic
        }
    }

    protected Connection createConnection() throws SQLException {
        return DriverManager.getConnection(DB_URL);
    }
}

// Test — override the seam
class LegacyOrderDaoTest {
    @Test
    void findById_ReturnsOrder() {
        var dao = new LegacyOrderDao() {
            @Override
            protected Connection createConnection() {
                return testDataSource.getConnection();
            }
        };
        var result = dao.findById(1L);
        assertNotNull(result);
    }
}
```

### Characterization Tests

Use Copilot to generate tests that capture current behavior:

```text
Generate characterization tests for this legacy service class.
The tests should document current behavior, not assert correct behavior.
Include edge cases discovered by analyzing the code paths.
```

```java
@DisplayName("Characterization tests for LegacyPricingEngine")
class LegacyPricingEngineCharacterizationTest {

    private LegacyPricingEngine engine = new LegacyPricingEngine();

    @Test
    @DisplayName("calculates base price for standard customer")
    void standardCustomer_BasePrice() {
        // Documents: standard customers get no discount
        var price = engine.calculatePrice("STANDARD", 100.00, 1);
        assertEquals(100.00, price, 0.01);
    }

    @Test
    @DisplayName("applies 10% discount for premium customer")
    void premiumCustomer_10PercentDiscount() {
        // Documents: premium gets exactly 10%, not rounded
        var price = engine.calculatePrice("PREMIUM", 100.00, 1);
        assertEquals(90.00, price, 0.01);
    }

    @Test
    @DisplayName("applies quantity discount above 10 items")
    void bulkOrder_QuantityDiscount() {
        // Documents: quantity > 10 gets additional 5%
        var price = engine.calculatePrice("STANDARD", 100.00, 15);
        assertEquals(95.00, price, 0.01);
    }

    @Test
    @DisplayName("null customer type returns base price (silent fallthrough)")
    void nullCustomerType_ReturnsBasePrice() {
        // Documents: null type silently falls through — potential bug
        var price = engine.calculatePrice(null, 100.00, 1);
        assertEquals(100.00, price, 0.01);
    }

    @Test
    @DisplayName("negative quantity does not throw (potential bug)")
    void negativeQuantity_NoException() {
        // Documents: negative qty is accepted — should validate
        assertDoesNotThrow(() ->
            engine.calculatePrice("STANDARD", 100.00, -5));
    }
}
```

---

## Section 7 — Capstone: Modernize a Legacy Java Application

<Hands0n title="Modernize a Legacy Java Application">

### Goal

Take a simulated legacy Java application and modernize it through all phases using Copilot.

### Starting Application

Create a legacy-style application with these intentional issues:

| File | Issues |
|---|---|
| `LegacyOrderService.java` | Java 7 style, no tests, static utility calls |
| `LegacyOrderDao.java` | Direct JDBC, no connection pooling, SQL concatenation |
| `LegacyPricingEngine.java` | Giant switch statement, magic numbers, no null checks |
| `LegacyReportGenerator.java` | File I/O without try-with-resources, string concatenation |

### Modernization Steps

**Phase 1 — Add Characterization Tests (30 min)**

1. Use Copilot to generate characterization tests for all four classes.
2. Run the tests to verify they capture current behavior.
3. Achieve at least 70% line coverage.

**Phase 2 — Modernize Language Features (15 min)**

1. Use Chat to modernize each class to Java 21.
2. Convert to records, streams, pattern matching, text blocks.
3. Run characterization tests to verify behavior is preserved.

**Phase 3 — Migrate to Jakarta EE (10 min)**

1. Update namespace from `javax.*` to `jakarta.*`.
2. Replace EJB with CDI beans.
3. Update POM dependencies.

**Phase 4 — Improve Design (20 min)**

1. Extract interfaces for all services.
2. Add dependency injection.
3. Replace the pricing switch statement with a Strategy pattern.
4. Add proper null handling and input validation.

**Phase 5 — Add Proper Tests (15 min)**

1. Generate unit tests with mocks for all service classes.
2. Generate integration tests for the DAO.
3. Achieve 85% line coverage.

### Verification

```bash
# After each phase, run tests
mvn test

# Check coverage
mvn verify -Pjacoco
# Open target/site/jacoco/index.html

# Verify the application still works end-to-end
mvn exec:java -Dexec.mainClass="com.example.Main"
```

### Evaluation Criteria

- [ ] Characterization tests pass before and after changes
- [ ] All Java 21 features are used appropriately
- [ ] Jakarta EE namespace is fully migrated
- [ ] Strategy pattern replaces the switch statement
- [ ] All classes have proper null handling
- [ ] Unit test coverage is at least 85%
- [ ] No regression in application behavior

</Hands0n>

---

## Summary

You developed a legacy modernization strategy, migrated Java EE to Jakarta EE, decomposed a monolith into modules, applied automated code transformations, and wrote tests for untested legacy code. This completes the Eclipse + Copilot track. You now have the skills to modernize enterprise Java applications systematically with AI assistance.
