---
name: new-crud
description: >
  Generate a complete end-to-end DDD CRUD module for a given domain entity.
  Use when the user asks to create a new feature, module, entity, or CRUD for something.
  Example triggers: "create CRUD for Product", "new module for Order", "scaffold Category feature"
---

## Project structure snapshot
!`find app/api/src/main/java -type f -name "*.java" | head -30`

## Existing base classes
!`find app/api/src/main/java -type f \\( -name "Audit.java" -o -name "ApiRes.java" -o -name "PagingRes.java" -o -name "NotFoundException.java" -o -name "GlobalExceptionHandler.java" \\) 2>/dev/null | head -10`

## Current migrations
!`ls -1 app/api/src/main/resources/db/migration/ 2>/dev/null | tail -5`

## Build tool
!`ls app/api/build.gradle app/api/gradlew 2>/dev/null`

---

## Instructions

Generate a **complete DDD CRUD module** for: `$ARGUMENTS`

Follow every step in order. Do not skip any step. After all files are created, run the build and tests.

---

## Step 1 — Analyze & Plan

Before writing any code:

1. Infer the **entity name** from `$ARGUMENTS` (e.g., "product" → `Product`)
2. Infer reasonable **fields** from the entity name and common sense:
   - Always include: `id`, `createdAt`, `updatedAt`
   - Infer domain fields (e.g., Product → `name`, `description`, `price`, `sku`, `stock`, `status`)
3. Determine the **base package** by reading the existing Java files above
4. Determine the **next Flyway version number** from the migration list above
5. Check if these base classes already exist. If not, create them first:
   - `Audit` — common JPA fields
   - `ApiRes` — standard API wrapper
   - `PagingRes<T>` — standard paging wrapper
   - `NotFoundException` — 404 exception
   - `GlobalExceptionHandler` — `@ControllerAdvice`
6. Print a short plan summary before proceeding:
   ```
   📦 Module     : Product
   📁 Package    : com.app.oopsly.api.product
   🗄️  Migration  : V<n>__create_product_table.sql
   📋 Fields     : id, name, description, price, sku, stock, status, createdAt, updatedAt
   🔗 Endpoints  : POST /v1/<entities>, GET /v1/<entities>/{id}, GET /v1/<entities> (paged), PUT /v1/<entities>/{id}, PATCH /v1/<entities>/{id}
   ```

---

## Step 2 — Flyway Migration

Create `app/api/src/main/resources/db/migration/V<n>__create_<table>_table.sql`:

```sql
CREATE TABLE IF NOT EXISTS <table_name> (
    id          UUID PRIMARY KEY,
    deleted     BOOLEAN DEFAULT FALSE,
    -- all domain fields with proper PostgreSQL types:
    --   String      → VARCHAR(255) NOT NULL
    --   Text        → TEXT
    --   BigDecimal  → NUMERIC(19, 2) NOT NULL
    --   Integer     → INTEGER NOT NULL DEFAULT 0
    --   Boolean     → BOOLEAN NOT NULL DEFAULT TRUE
    --   Enum        → VARCHAR(50) NOT NULL
    --   FK          → UUID NOT NULL REFERENCES other_table(id)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index every column used in WHERE / ORDER BY / JOIN
CREATE INDEX idx_<table>_<col> ON <table>(<col>);
```

Rules:
- Use `TIMESTAMPTZ`, never `TIMESTAMP`
- Use `NUMERIC(19,2)` for money/price fields
- Add `IF NOT EXISTS` on all statements
- Add an index for every FK and every commonly filtered column (e.g., `status`, `sku`)

---

## Step 3 — Package Structure

Create all files under:
```
app/api/src/main/java/<base_package>/<entity_lower>/
├── <Entity>.java                      ← JPA Entity
├── <Entity>Status.java                ← Enum (if entity has a status)
├── <Entity>Repository.java            ← Spring Data JPA Repository
├── <Entity>Service.java               ← Service interface
├── <Entity>ServiceImpl.java           ← Service implementation
├── <Entity>Controller.java            ← REST Controller
└── vm/
    ├── <Entity>Req.java               ← Java record, input for POST/PUT
    └── <Entity>Res.java               ← Java record, output for API responses
```

---

## Step 4 — Base Classes (create only if missing)

### `Audit.java`
```java
@Getter
@Setter
@MappedSuperclass
public abstract class Audit {

    @Id
    @GeneratedValue
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    private UUID id;

    @JsonIgnore
    @CreationTimestamp
    private Instant createdAt;

    @JsonIgnore
    @UpdateTimestamp
    private Instant updatedAt;

    @JsonIgnore
    private Boolean deleted = false;
}
```

### `ApiRes.java`
```java
public class ApiRes extends ResponseEntity<Res> {
    private static ApiRes build(HttpStatus status, boolean isSuccess, String message, Object data) {
        return new ApiRes(new Res(isSuccess, Instant.now(), message, status.value(), data), status);
    }

    public static ApiRes created(String message, Object data) {
        return build(HttpStatus.CREATED, true, message, data);
    }

    public static ApiRes success(String message, Object data) {
        return build(HttpStatus.OK, true, message, data);
    }

    public static ApiRes notFound(String message) {
        return build(HttpStatus.NOT_FOUND, false, message, null);
    }

    public static ApiRes badRequest(String message) {
        return build(HttpStatus.BAD_REQUEST, false, message, null);
    }

    public static ApiRes internalError(String message) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, false, message, null);
    }
}
```

### `PagingRes.java`
```java
public record PagingRes<T>(
    List<T> entities,
    int currentPage,
    long totalItems,
    int totalPages,
    boolean hasNextPage
) {}
```

### `NotFoundException.java`
```java
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
```

### `GlobalExceptionHandler.java`
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ApiRes handleNotFound(NotFoundException ex) {
        return ApiRes.notFound(ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ApiRes handleValidation(MethodArgumentNotValidException ex) {
        return ApiRes.badRequest("Bad request. Please check your input and try again.");
    }

    @ExceptionHandler(Exception.class)
    public ApiRes handleGeneral(Exception ex) {
        return ApiRes.internalError("Internal server error occurred.");
    }
}
```

---

## Step 5 — Entity

```java
@Entity
@Table(name = "<table_name>")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class <Entity> extends Audit {

    // All domain fields with proper JPA annotations
    // String fields   → @Column(nullable = false, length = 255)
    // Unique fields   → @Column(unique = true, nullable = false)
    // Text fields     → @Column(columnDefinition = "TEXT")
    // Numeric fields  → @Column(nullable = false, precision = 19, scale = 2)
    // Enum fields     → @Enumerated(EnumType.STRING) @Column(nullable = false, length = 50)
    // Boolean fields  → @Column(nullable = false) with a default in the field declaration
}
```

---

## Step 6 — Enum (if status field exists)

```java
public enum <Entity>Status {
    ACTIVE,
    INACTIVE,
    DELETED;
}
```

---

## Step 7 — Request/Response VMs

### `<Entity>Req.java` (Java record)
- Include all user-provided fields (no id, no createdAt, no updatedAt)
- Add validation annotations on each field:
  - `@NotBlank` for strings
  - `@NotNull` for objects/enums
  - `@DecimalMin("0.0")` for prices
  - `@Min(0)` for integers
  - `@Size(max = 255)` for strings
  - `@Pattern` for fields like SKU or codes

### `<Entity>Res.java` (Java record)
- All fields including `id`, `createdAt`, `updatedAt`
- Include a static `from(<Entity> entity)` factory method for mapping

---

## Step 8 — Repository

```java
@Repository
public interface <Entity>Repository extends JpaRepository<<Entity>, UUID> {

    // Paging with optional filter by status
    Page<<Entity>> findByStatusAndDeletedFalse(<Entity>Status status, Pageable pageable);

    // Paging all (no filter)
    Page<<Entity>> findAllByDeletedFalse(Pageable pageable);

    // Find by unique field (e.g., sku) — add if entity has a unique field
    Optional<<Entity>> findBySkuAndDeletedFalse(String sku);

    // Check existence by unique field before create/update
    boolean existsBySkuAndDeletedFalse(String sku);
}
```

---

## Step 9 — Service Interface

```java
public interface <Entity>Service {

    ApiRes create(<Entity>Req request);

    ApiRes getById(UUID id);

    ApiRes getAll(int page, int size);

    ApiRes update(UUID id, <Entity>Req request);

    ApiRes delete(UUID id);
}
```

---

## Step 10 — Service Implementation

```java
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class <Entity>ServiceImpl implements <Entity>Service {

    private final <Entity>Repository repository;

    @Override
    public ApiRes create(<Entity>Req request) {
        // 1. Validate uniqueness (e.g., sku must not already exist)
        // 2. Build entity using builder pattern
        // 3. Save and return mapped response
        log.info("Creating new <entity>: {}", request);
        <Entity> entity = <Entity>.builder()
            // map all fields from request
            .build();
        return ApiRes.created("Created successfully", <Entity>Res.from(repository.save(entity)));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiRes getById(UUID id) {
        return ApiRes.success("Fetched successfully", <Entity>Res.from(findByIdOrThrow(id)));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiRes getAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<<Entity>> pageData = repository.findAllByDeletedFalse(pageable);
        PagingRes<<Entity>Res> pagingRes = new PagingRes<>(
            pageData.map(<Entity>Res::from).getContent(),
            pageable.getPageNumber(),
            pageData.getTotalElements(),
            pageData.getTotalPages(),
            pageData.hasNext()
        );
        return ApiRes.success("Fetched successfully", pagingRes);
    }

    @Override
    public ApiRes update(UUID id, <Entity>Req request) {
        <Entity> entity = findByIdOrThrow(id);
        // Apply fields from request
        return ApiRes.success(
            "Updated successfully",
            <Entity>Res.from(repository.save(entity))
        );
    }

    @Override
    public ApiRes delete(UUID id) {
        <Entity> entity = findByIdOrThrow(id);
        entity.setDeleted(true);
        repository.save(entity);
        log.info("Deleted <entity> with id: {}", id);
        return ApiRes.success("Deleted successfully");
    }

    private <Entity> findByIdOrThrow(UUID id) {
        return repository.findById(id)
            .filter(entity -> !Boolean.TRUE.equals(entity.getDeleted()))
            .orElseThrow(() -> new NotFoundException("<Entity> not found with id: " + id));
    }
}
```

---

## Step 11 — Controller

```java
@RestController
@RequestMapping("/v1/<entities>")
@RequiredArgsConstructor
@Validated
@Tag(name = "<Entity> Management", description = "APIs for managing <entities>")
public class <Entity>Controller {

    private final <Entity>Service service;

    @PostMapping
    @Operation(summary = "Create a new <entity>")
    public ApiRes create(@Valid @RequestBody <Entity>Req request) {
        return service.create(request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get <entity> by ID")
    public ApiRes getById(@PathVariable UUID id) {
        return service.getById(id);
    }

    @GetMapping
    @Operation(summary = "Get all <entities> with pagination")
    public ApiRes getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return service.getAll(page, size);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing <entity>")
    public ApiRes update(@PathVariable UUID id, @Valid @RequestBody <Entity>Req request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Delete a <entity>")
    public ApiRes delete(@PathVariable UUID id) {
        return service.delete(id);
    }
}
```

---

## Step 12 — Tests

### Unit Test: `<Entity>ServiceImplTest.java`
Location: `app/api/src/test/java/com/app/oopsly/api/unit/<entity_lower>/application/`

- Use `@ExtendWith(MockitoExtension.class)`
- Mock `<Entity>Repository`
- Test cases:
  - `create_validRequest_returnsApiRes()`
  - `create_duplicateSku_throwsException()` ← if unique field exists
  - `getById_existingId_returnsApiRes()`
  - `getById_nonExistingId_throwsNotFoundException()`
  - `getAll_returnsPagingRes()`
  - `update_existingId_updatesFields()`
  - `delete_existingId_deletesEntity()`
  - `delete_nonExistingId_throwsNotFoundException()`

### Integration Test: `<Entity>ControllerTest.java`
Location: `app/api/src/test/java/com/app/oopsly/api/integration/`

- Use `@SpringBootTest` + `@AutoConfigureMockMvc` + `@Testcontainers`
- Spin up PostgreSQL via Testcontainers:
```java
@Container
static PostgreSQLContainer<?> postgres =
    new PostgreSQLContainer<>("postgres:15-alpine");

@DynamicPropertySource
static void configure(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
}
```
- Test cases with MockMvc:
  - `POST /v1/<entities>` → 201 Created
  - `POST /v1/<entities>` with invalid body → 400 Bad Request
  - `GET /v1/<entities>/{id}` existing → 200 OK
  - `GET /v1/<entities>/{id}` not found → 404 Not Found
  - `GET /v1/<entities>` → 200 OK with paging fields
  - `PUT /v1/<entities>/{id}` → 200 OK
  - `PUT /v1/<entities>/{id}` not found → 404 Not Found
  - `PATCH /v1/<entities>/{id}` → 200 OK soft delete
  - `PATCH /v1/<entities>/{id}` not found → 404 Not Found

---

## Step 13 — Final Verification

Run in this exact order and fix any errors before proceeding to the next step:

```bash
cd app/api

# 1. Compile
./gradlew compileJava -q

# 2. Unit tests only (fast)
./gradlew test -q --tests "com.app.oopsly.api.unit.<entity_lower>.*"

# 3. Integration tests
./gradlew integrationTest -q --tests "*<Entity>ControllerTest"

# 4. Full build
./gradlew build -q
```

If any step fails:
- Read the full error output
- Fix the root cause (do NOT suppress errors)
- Re-run that step before moving on

---

## Step 14 — Summary Report

After all steps complete successfully, print this report:

```
✅ CRUD Module Created: <Entity>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Package      : <base_package>.<entity_lower>
🗄️  Migration    : V<n>__create_<table>_table.sql

📄 Files Created:
   Entity       : <Entity>.java
   Enum         : <Entity>Status.java
   Repository   : <Entity>Repository.java
   Service      : <Entity>Service.java + <Entity>ServiceImpl.java
   Controller   : <Entity>Controller.java
   VMs          : <Entity>Req.java
                  <Entity>Res.java
   Tests        : <Entity>ServiceImplTest.java
                  <Entity>ControllerTest.java

🌐 Endpoints:
   POST    /v1/<entities>       → Create
   GET     /v1/<entities>/{id}  → Get by ID
   GET     /v1/<entities>       → Get all (paged)
   PUT     /v1/<entities>/{id}  → Update
   PATCH   /v1/<entities>/{id}  → Soft delete

🧪 Tests: All passed ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```