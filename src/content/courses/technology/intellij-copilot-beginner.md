---
title: "Copilot in IntelliJ IDEA: Java & Kotlin AI Assistance"
description: "Install and configure GitHub Copilot in IntelliJ IDEA for Java and Kotlin development with AI-powered completions."
track: "technology"
difficulty: "beginner"
featureRefs: [code-completions, copilot-chat, ghost-text]
personaTags: [developer, student]
technologyTags: [intellij, java, kotlin, copilot]
estimatedMinutes: 20
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n } from "@components/course";

## Welcome to GitHub Copilot in IntelliJ IDEA

GitHub Copilot brings AI-powered code completions to IntelliJ IDEA, supporting Java, Kotlin, and the broader JetBrains ecosystem. This course covers installation, navigating between JetBrains AI and Copilot, Java and Kotlin completions, the Chat tool window, Maven and Gradle support, and a hands-on exercise building a Spring Boot REST controller.

### What You Will Learn

- Install and configure the Copilot plugin in IntelliJ IDEA
- Understand how Copilot compares to JetBrains AI Assistant
- Accept and navigate Java and Kotlin completions
- Use Spring Boot patterns effectively with Copilot
- Work with the Chat tool window
- Leverage Maven and Gradle integration
- Build a Spring Boot REST controller with AI assistance

---

## Section 1 — Installing the Copilot Plugin

### Prerequisites

| Requirement | Details |
|---|---|
| IntelliJ IDEA | 2023.2 or later (Community or Ultimate) |
| GitHub account | With active Copilot subscription |
| JDK | 17 or later |

### Installation Steps

<Step number={1}>
Open IntelliJ IDEA. Go to **File → Settings → Plugins** (or **IntelliJ IDEA → Preferences → Plugins** on macOS).
</Step>

<Step number={2}>
Click the **Marketplace** tab and search for **GitHub Copilot**. Click **Install**.
</Step>

<Step number={3}>
Restart IntelliJ when prompted. After restart, a notification appears asking you to sign in to GitHub.
</Step>

<Step number={4}>
Click **Sign in to GitHub**. A device code flow opens in your browser. Authorize the application and return to IntelliJ.
</Step>

<Step number={5}>
Verify the installation: look for the Copilot icon in the status bar at the bottom of the IDE. A green icon indicates Copilot is active.
</Step>

> **Tip:** If you use multiple JetBrains IDEs, the Copilot plugin works in all of them — PyCharm, WebStorm, GoLand, and more.

---

## Section 2 — JetBrains AI vs Copilot

IntelliJ offers two AI features that can coexist:

| Feature | JetBrains AI Assistant | GitHub Copilot |
|---|---|---|
| Provider | JetBrains | GitHub / OpenAI |
| Completion style | Inline and chat | Ghost text and chat |
| IDE integration | Deep IntelliJ integration | Cross-IDE consistency |
| Subscription | Separate JetBrains license | GitHub Copilot subscription |
| Refactoring awareness | Uses IntelliJ refactoring engine | Independent suggestions |
| Language focus | All JetBrains-supported languages | Broad language support |

### Choosing Your Workflow

You can use both simultaneously. Copilot provides ghost text suggestions while JetBrains AI integrates with IntelliJ's refactoring and inspection systems. If they conflict, adjust priority in **Settings → Tools → GitHub Copilot → Suggestion Preference**.

---

## Section 3 — Java Completions

### Method Generation

Type a method signature and Copilot generates the body:

```java
public List<User> findActiveUsersByAge(int minAge, int maxAge) {
    // Copilot suggests:
    return userRepository.findAll().stream()
        .filter(user -> user.isActive())
        .filter(user -> user.getAge() >= minAge && user.getAge() <= maxAge)
        .sorted(Comparator.comparing(User::getLastName))
        .collect(Collectors.toList());
}
```

### Record and Sealed Class Patterns

```java
// Copilot understands modern Java features
public sealed interface Shape permits Circle, Rectangle, Triangle {
    double area();
}

public record Circle(double radius) implements Shape {
    // Copilot generates:
    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}
```

### Builder Pattern

Type `// Builder pattern for User class` and Copilot generates:

```java
public class User {
    private final String name;
    private final String email;
    private final int age;

    private User(Builder builder) {
        this.name = builder.name;
        this.email = builder.email;
        this.age = builder.age;
    }

    public static class Builder {
        private String name;
        private String email;
        private int age;

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder age(int age) {
            this.age = age;
            return this;
        }

        public User build() {
            return new User(this);
        }
    }
}
```

---

## Section 4 — Kotlin Completions

### Data Classes and Extensions

```kotlin
// Copilot generates Kotlin-idiomatic code
data class Product(
    val id: Long,
    val name: String,
    val price: BigDecimal,
    val category: String
)

fun List<Product>.filterByCategory(category: String): List<Product> =
    filter { it.category.equals(category, ignoreCase = true) }

fun List<Product>.totalPrice(): BigDecimal =
    sumOf { it.price }
```

### Coroutines

```kotlin
// Copilot understands Kotlin coroutines
suspend fun fetchUserWithOrders(userId: Long): UserWithOrders {
    return coroutineScope {
        val userDeferred = async { userRepository.findById(userId) }
        val ordersDeferred = async { orderRepository.findByUserId(userId) }

        val user = userDeferred.await()
            ?: throw UserNotFoundException(userId)

        UserWithOrders(
            user = user,
            orders = ordersDeferred.await()
        )
    }
}
```

### DSL Patterns

```kotlin
// Copilot generates DSL-style builders
fun html(init: HtmlBuilder.() -> Unit): String {
    val builder = HtmlBuilder()
    builder.init()
    return builder.build()
}

val page = html {
    head {
        title("My Page")
    }
    body {
        h1("Welcome")
        p("This is a paragraph.")
    }
}
```

---

## Section 5 — Chat Tool Window

### Opening Chat

- Click the **Copilot Chat** icon in the right tool window bar.
- Or go to **View → Tool Windows → GitHub Copilot Chat**.

### Chat Capabilities in IntelliJ

| Action | Example Prompt |
|---|---|
| Explain code | Select a method → right-click → **Copilot → Explain** |
| Generate code | "Create a singleton database connection pool in Java" |
| Fix errors | "Fix the NullPointerException at line 23" |
| Refactor | "Convert this class to use the Strategy pattern" |
| Write tests | "Generate JUnit 5 tests for ProductService" |

### Context-Aware Prompts

Chat in IntelliJ is aware of:

- The currently open file and selection
- Project structure and dependencies
- Build tool configuration (Maven/Gradle)
- Test framework in use

```text
Generate a Spring Boot integration test for the ProductController.
Use @SpringBootTest and MockMvc. The project uses JUnit 5 and H2 for testing.
```

---

## Section 6 — Maven and Gradle Support

### Maven POM Assistance

Copilot helps with `pom.xml` dependencies:

```xml
<!-- Type a comment and Copilot suggests the dependency -->
<!-- Spring Boot Starter Web -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Spring Boot Starter Data JPA -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- H2 Database for testing -->
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>
```

### Gradle Kotlin DSL

```kotlin
// build.gradle.kts — Copilot completes dependencies
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("io.mockk:mockk:1.13.9")
}
```

### Build Configuration Help

Ask Chat for build configuration assistance:

```text
How do I configure the Maven Surefire plugin to run tests in parallel
with 4 threads and generate a JaCoCo coverage report?
```

---

## Section 7 — Spring Boot Patterns

Copilot excels at Spring Boot boilerplate:

### Controller Pattern

```java
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<List<ProductDto>> getAllProducts() {
        return ResponseEntity.ok(productService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDto> getProductById(
            @PathVariable Long id) {
        return productService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ProductDto> createProduct(
            @Valid @RequestBody CreateProductRequest request) {
        var product = productService.create(request);
        var uri = URI.create("/api/products/" + product.id());
        return ResponseEntity.created(uri).body(product);
    }
}
```

### Configuration Properties

```java
@ConfigurationProperties(prefix = "app.product")
@Validated
public record ProductProperties(
    @NotNull Integer maxPageSize,
    @NotBlank String defaultCategory,
    @Positive Integer cacheTtlMinutes
) {}
```

---

## Section 8 — Hands-On Exercise

<Hands0n title="Build a Spring Boot REST Controller">

### Goal

Create a Spring Boot application with a fully functional product catalog API using Copilot.

### Steps

1. **Create a new project** using Spring Initializr (built into IntelliJ Ultimate) or [start.spring.io](https://start.spring.io). Add dependencies: Spring Web, Spring Data JPA, H2 Database, Validation.

2. **Define the entity**: Type `// Product entity with id, name, description, price, category, and createdAt` and accept Copilot's suggestion.

3. **Create the repository**: Type `// Spring Data JPA repository for Product with custom finder methods` and accept.

4. **Build the service**: Type `// Service layer for Product with CRUD operations and validation` and accept.

5. **Generate the controller**: Type `// REST controller for Product with GET, POST, PUT, DELETE endpoints` and accept.

6. **Add exception handling**: Type `// Global exception handler with @ControllerAdvice` and accept.

7. **Write a test**: Use Chat to generate a JUnit 5 test for the controller with MockMvc.

### Expected Result

A running Spring Boot application with:
- Product entity with JPA annotations
- Repository with custom query methods
- Service with business logic
- REST controller with proper HTTP status codes
- Global exception handler
- At least one integration test

### Verification

```bash
./mvnw spring-boot:run
# Navigate to http://localhost:8080/api/products
# Test with curl:
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","price":9.99,"category":"Tools"}'

./mvnw test
```

</Hands0n>

---

## Summary

You installed Copilot in IntelliJ IDEA, explored Java and Kotlin completions, worked with the Chat tool window, leveraged Maven and Gradle integration, and built a Spring Boot REST controller. The next course covers enterprise Spring Boot patterns with Copilot.
