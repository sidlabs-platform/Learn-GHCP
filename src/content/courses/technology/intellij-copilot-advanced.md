---
title: "IntelliJ: AI-Powered Microservices Architecture"
description: "Design and implement microservice architectures in Java/Kotlin using Copilot for service scaffolding, event-driven patterns, and testing."
track: "technology"
difficulty: "advanced"
featureRefs: [copilot-chat, agent-mode, copilot-agents]
personaTags: [architect, developer]
technologyTags: [intellij, java, kotlin, microservices, kafka]
prerequisites: [intellij-copilot-intermediate]
estimatedMinutes: 60
lastGenerated: 2026-04-08
published: true
---

import { Prereqs, Step, Hands0n, Warning } from "@components/course";

## AI-Powered Microservices Architecture

Building microservices in Java and Kotlin involves service discovery, messaging, resilience, containerization, and testing across distributed systems. In this advanced course you will use Copilot in IntelliJ to scaffold Spring Cloud microservices, implement Kafka event-driven architecture, add circuit breaker patterns, generate Docker and Kubernetes configurations, manage multi-module Gradle projects, and write performance tests.

### What You Will Learn

- Scaffold Spring Cloud microservices with Copilot
- Implement Kafka producers and consumers for event-driven communication
- Add circuit breaker and retry patterns with Resilience4j
- Generate Docker and Kubernetes deployment configurations
- Manage multi-module Gradle projects with shared libraries
- Write performance tests with Copilot assistance
- Complete a capstone: build a distributed order processing system

---

## Section 1 — Spring Cloud Microservices

### Service Discovery with Eureka

Generate a Eureka server and client configuration:

```java
// Eureka Server — Application class
@SpringBootApplication
@EnableEurekaServer
public class DiscoveryServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiscoveryServerApplication.class, args);
    }
}
```

```yaml
# application.yml for Eureka Server
server:
  port: 8761

eureka:
  client:
    register-with-eureka: false
    fetch-registry: false
  server:
    wait-time-in-ms-when-sync-empty: 0
```

### Service Client Configuration

```java
// Order Service registers with Eureka
@SpringBootApplication
@EnableDiscoveryClient
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }

    @Bean
    @LoadBalanced
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
```

### API Gateway with Spring Cloud Gateway

```java
@SpringBootApplication
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }

    @Bean
    public RouteLocator customRouteLocator(
            RouteLocatorBuilder builder) {
        return builder.routes()
            .route("order-service", r -> r
                .path("/api/orders/**")
                .filters(f -> f
                    .circuitBreaker(config -> config
                        .setName("orderServiceCB")
                        .setFallbackUri("forward:/fallback/orders"))
                    .retry(config -> config.setRetries(3)))
                .uri("lb://order-service"))
            .route("inventory-service", r -> r
                .path("/api/inventory/**")
                .uri("lb://inventory-service"))
            .route("notification-service", r -> r
                .path("/api/notifications/**")
                .uri("lb://notification-service"))
            .build();
    }
}
```

### Config Server

```text
Generate a Spring Cloud Config Server that reads configuration from
a Git repository and serves it to all microservices.
```

```java
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}
```

---

## Section 2 — Kafka Event-Driven Architecture

### Kafka Configuration

```java
@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic orderEventsTopic() {
        return TopicBuilder.name("order-events")
            .partitions(6)
            .replicas(3)
            .config(TopicConfig.RETENTION_MS_CONFIG, "604800000") // 7 days
            .build();
    }

    @Bean
    public NewTopic inventoryEventsTopic() {
        return TopicBuilder.name("inventory-events")
            .partitions(6)
            .replicas(3)
            .build();
    }
}
```

### Event Producer

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEventProducer {

    private final KafkaTemplate<String, OrderEvent> kafkaTemplate;

    public CompletableFuture<SendResult<String, OrderEvent>> publishOrderCreated(
            Order order) {
        var event = new OrderCreatedEvent(
            order.getId(),
            order.getCustomerId(),
            order.getItems().stream()
                .map(item -> new OrderItemEvent(
                    item.getProductId(),
                    item.getQuantity(),
                    item.getUnitPrice()))
                .toList(),
            order.getTotalAmount(),
            Instant.now()
        );

        log.info("Publishing OrderCreated event for order {}", order.getId());

        return kafkaTemplate.send("order-events", order.getId().toString(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish event for order {}",
                        order.getId(), ex);
                } else {
                    log.info("Event published to partition {} offset {}",
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
    }
}
```

### Event Consumer

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryEventConsumer {

    private final InventoryService inventoryService;
    private final KafkaTemplate<String, InventoryEvent> kafkaTemplate;

    @KafkaListener(
        topics = "order-events",
        groupId = "inventory-service",
        containerFactory = "kafkaListenerContainerFactory")
    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2.0),
        dltStrategy = DltStrategy.FAIL_ON_ERROR)
    public void handleOrderCreated(
            @Payload OrderCreatedEvent event,
            @Header(KafkaHeaders.RECEIVED_KEY) String key,
            Acknowledgment ack) {
        log.info("Received OrderCreated event: {}", event.orderId());

        try {
            var reservation = inventoryService.reserveItems(
                event.orderId(), event.items());

            kafkaTemplate.send("inventory-events", key,
                new StockReservedEvent(
                    event.orderId(),
                    reservation.reservationId(),
                    Instant.now()));

            ack.acknowledge();
            log.info("Stock reserved for order {}", event.orderId());

        } catch (InsufficientStockException ex) {
            kafkaTemplate.send("inventory-events", key,
                new StockReservationFailedEvent(
                    event.orderId(),
                    ex.getProductId(),
                    ex.getMessage(),
                    Instant.now()));

            ack.acknowledge();
            log.warn("Stock reservation failed for order {}",
                event.orderId());
        }
    }
}
```

### Event Schema

```java
public sealed interface OrderEvent permits
        OrderCreatedEvent, OrderCancelledEvent, OrderShippedEvent {}

public record OrderCreatedEvent(
    UUID orderId,
    UUID customerId,
    List<OrderItemEvent> items,
    BigDecimal totalAmount,
    Instant timestamp
) implements OrderEvent {}

public record OrderItemEvent(
    UUID productId,
    int quantity,
    BigDecimal unitPrice
) {}
```

---

## Section 3 — Circuit Breaker Patterns

### Resilience4j Configuration

```yaml
resilience4j:
  circuitbreaker:
    instances:
      inventoryService:
        sliding-window-size: 10
        failure-rate-threshold: 50
        wait-duration-in-open-state: 10s
        permitted-number-of-calls-in-half-open-state: 3
        record-exceptions:
          - java.io.IOException
          - java.util.concurrent.TimeoutException
        ignore-exceptions:
          - com.example.BusinessException
  retry:
    instances:
      inventoryService:
        max-attempts: 3
        wait-duration: 500ms
        exponential-backoff-multiplier: 2
  timelimiter:
    instances:
      inventoryService:
        timeout-duration: 3s
```

### Annotated Service Calls

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryClient {

    private final RestTemplate restTemplate;

    @CircuitBreaker(name = "inventoryService", fallbackMethod = "checkStockFallback")
    @Retry(name = "inventoryService")
    @TimeLimiter(name = "inventoryService")
    public CompletableFuture<StockResponse> checkStock(UUID productId, int quantity) {
        return CompletableFuture.supplyAsync(() -> {
            var response = restTemplate.getForObject(
                "http://inventory-service/api/inventory/{productId}/check?quantity={quantity}",
                StockResponse.class, productId, quantity);
            return response;
        });
    }

    private CompletableFuture<StockResponse> checkStockFallback(
            UUID productId, int quantity, Throwable throwable) {
        log.warn("Fallback for checkStock: productId={}, reason={}",
            productId, throwable.getMessage());
        return CompletableFuture.completedFuture(
            new StockResponse(productId, false, 0, "Service unavailable"));
    }
}
```

### Monitoring Circuit Breaker State

```java
@RestController
@RequestMapping("/api/resilience")
@RequiredArgsConstructor
public class ResilienceController {

    private final CircuitBreakerRegistry circuitBreakerRegistry;

    @GetMapping("/circuit-breakers")
    public Map<String, CircuitBreakerStatus> getCircuitBreakers() {
        return circuitBreakerRegistry.getAllCircuitBreakers().stream()
            .collect(Collectors.toMap(
                CircuitBreaker::getName,
                cb -> new CircuitBreakerStatus(
                    cb.getState().name(),
                    cb.getMetrics().getFailureRate(),
                    cb.getMetrics().getNumberOfSuccessfulCalls(),
                    cb.getMetrics().getNumberOfFailedCalls()
                )));
    }
}
```

---

## Section 4 — Docker and Kubernetes Configuration

### Dockerfile Generation

```text
Generate a multi-stage Dockerfile for a Spring Boot application
with JDK 21, optimized layer extraction, and non-root user.
```

```dockerfile
# Stage 1: Build
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY gradle/ gradle/
COPY gradlew build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon
COPY src/ src/
RUN ./gradlew bootJar --no-daemon

# Stage 2: Extract layers
FROM eclipse-temurin:21-jdk AS extractor
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# Stage 3: Runtime
FROM eclipse-temurin:21-jre
RUN groupadd -r appuser && useradd -r -g appuser appuser
WORKDIR /app

COPY --from=extractor /app/dependencies/ ./
COPY --from=extractor /app/spring-boot-loader/ ./
COPY --from=extractor /app/snapshot-dependencies/ ./
COPY --from=extractor /app/application/ ./

USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  labels:
    app: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: registry.example.com/order-service:latest
          ports:
            - containerPort: 8080
          env:
            - name: SPRING_PROFILES_ACTIVE
              value: "kubernetes"
            - name: KAFKA_BOOTSTRAP_SERVERS
              valueFrom:
                configMapKeyRef:
                  name: kafka-config
                  key: bootstrap-servers
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

---

## Section 5 — Multi-Module Gradle Projects

### Root `settings.gradle.kts`

```kotlin
rootProject.name = "ecommerce-platform"

include(
    ":shared-kernel",
    ":order-service",
    ":inventory-service",
    ":notification-service",
    ":api-gateway",
    ":discovery-server"
)
```

### Shared Kernel Module

```kotlin
// shared-kernel/build.gradle.kts
plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
}

dependencies {
    api("com.fasterxml.jackson.module:jackson-module-kotlin")
    api("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")
}
```

```kotlin
// Shared event interfaces used across all services
package com.example.shared.events

interface DomainEvent {
    val eventId: UUID
    val aggregateId: UUID
    val timestamp: Instant
    val eventType: String
}

data class OrderCreated(
    override val eventId: UUID = UUID.randomUUID(),
    override val aggregateId: UUID,
    override val timestamp: Instant = Instant.now(),
    override val eventType: String = "ORDER_CREATED",
    val customerId: UUID,
    val items: List<OrderItemDto>,
    val totalAmount: BigDecimal
) : DomainEvent
```

### Service Module Configuration

```kotlin
// order-service/build.gradle.kts
plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
    id("org.springframework.boot")
}

dependencies {
    implementation(project(":shared-kernel"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.kafka:spring-kafka")
    implementation("io.github.resilience4j:resilience4j-spring-boot3")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.kafka:spring-kafka-test")
    testImplementation("org.testcontainers:kafka")
    testImplementation("org.testcontainers:postgresql")
}
```

---

## Section 6 — Performance Testing

### Generating Load Tests with Gatling

```text
Generate a Gatling load test for the Order Service that simulates
100 concurrent users creating orders over 5 minutes with a ramp-up.
```

```scala
class OrderServiceSimulation extends Simulation {

  val httpProtocol: HttpProtocolBuilder = http
    .baseUrl("http://localhost:8080")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  val createOrderScenario: ScenarioBuilder = scenario("Create Orders")
    .exec(
      http("Create Order")
        .post("/api/orders")
        .body(StringBody(
          """{
            "customerId": "${randomUUID}",
            "items": [
              {"productId": "${randomUUID}", "quantity": 2, "unitPrice": 29.99}
            ]
          }"""))
        .check(status.is(201))
        .check(jsonPath("$.id").saveAs("orderId")))
    .pause(1, 3)
    .exec(
      http("Get Order")
        .get("/api/orders/${orderId}")
        .check(status.is(200)))

  setUp(
    createOrderScenario.inject(
      rampUsers(100).during(60),
      constantUsersPerSec(20).during(240)
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.max.lt(2000),
      global.successfulRequests.percent.gt(99.0)
    )
}
```

### Integration Tests with Testcontainers

```java
@SpringBootTest
@Testcontainers
class OrderServiceIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    static KafkaContainer kafka =
        new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.5.0"));

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired private OrderService orderService;
    @Autowired private KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @Test
    void createOrder_PublishesKafkaEvent() {
        var request = new CreateOrderRequest(
            UUID.randomUUID(),
            List.of(new OrderItemRequest(UUID.randomUUID(), 2, BigDecimal.TEN)));

        var result = orderService.createOrder(request);

        assertThat(result).isNotNull();
        assertThat(result.status()).isEqualTo(OrderStatus.PENDING);
        // Verify Kafka event was published using embedded consumer
    }
}
```

---

## Section 7 — Capstone: Distributed Order Processing System

<Hands0n title="Build a Distributed Order Processing System">

### Goal

Build a microservices-based order processing system with event-driven communication, circuit breakers, and containerized deployment.

### Architecture

```text
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ API Gateway  │────▶│  Order Service   │────▶│ Inventory Service │
│ (Spring GW)  │     │  (REST + Kafka)  │     │   (REST + Kafka)  │
└─────────────┘     └────────┬────────┘     └──────────────────┘
                             │ Kafka
                    ┌────────▼────────┐
                    │  Notification    │
                    │  Service (Worker)│
                    └─────────────────┘
```

### Implementation Steps

1. **Set up multi-module Gradle project** with shared-kernel, three services, and API gateway.
2. **Build Order Service:** REST API with CQRS, Kafka producer for order events.
3. **Build Inventory Service:** Kafka consumer that reserves stock, REST endpoint for queries.
4. **Build Notification Service:** Kafka consumer that logs notifications (simulated email).
5. **Add circuit breakers** between Order Service and Inventory Service.
6. **Create Docker Compose** configuration for all services plus Kafka and PostgreSQL.
7. **Write integration tests** using Testcontainers that verify the complete flow.
8. **Generate Kubernetes manifests** for production deployment.

### Docker Compose for Local Development

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      CLUSTER_ID: "MkU3OEVBNTcwNTJENDM2Qk"
    ports:
      - "9092:9092"
```

### Verification

```bash
# Build all modules
./gradlew build

# Run tests
./gradlew test

# Start with Docker Compose
docker-compose up -d

# Test the flow
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":"...","items":[...]}'

# Check order status
curl http://localhost:8080/api/orders/{id}

# Verify Kafka events in logs
docker-compose logs notification-service
```

### Evaluation Criteria

- [ ] All services start and register with discovery
- [ ] Order creation publishes a Kafka event
- [ ] Inventory service reserves stock automatically
- [ ] Notification service receives the event
- [ ] Circuit breaker activates when inventory service is down
- [ ] Integration tests pass with Testcontainers
- [ ] Docker Compose starts the full stack

</Hands0n>

---

## Summary

You built Spring Cloud microservices, implemented Kafka event-driven architecture, added Resilience4j circuit breakers, generated Docker and Kubernetes configurations, managed multi-module Gradle projects, and wrote performance tests. This completes the IntelliJ IDEA + Copilot track.
