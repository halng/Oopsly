---
name: new-crud
description: >
  Generate a complete end-to-end DDD CRUD module for a given domain entity.
  Use when the user asks to create a new feature, module, entity, or CRUD for something.
  Example triggers: "create CRUD for Product", "new module for Order", "scaffold Category feature"
---

## Project structure snapshot
!`find src/main/java -type f -name "*.java" | head -30`

## Existing base classes
!`find src/main/java -type f -name "BaseEntity.java" -o -name "BaseResponse.java" -o -name "ResourceNotFoundException.java" -o -name "GlobalExceptionHandler.java" 2>/dev/null | head -10`

## Current migrations
!`ls -1 src/main/resources/db/migration/ 2>/dev/null | tail -5`

## Build tool
!`ls pom.xml build.gradle 2>/dev/null`

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
   - `BaseEntity` — common JPA fields
   - `ApiResponse<T>` — standard API wrapper
   - `PageResponse<T>` — standard paging wrapper
   - `ResourceNotFoundException` — 404 exception
   - `GlobalExceptionHandler` — `@ControllerAdvice`
6. Print a short plan summary before proceeding:
   ```
   📦 Module     : Product
   📁 Package    : com.example.app.product
   🗄️  Migration  : V<n>__create_product_table.sql
   📋 Fields     : id, name, description, price, sku, stock, status, createdAt, updatedAt
   🔗 Endpoints  : POST /, GET /{id}, GET / (paged), PUT /{id}, DELETE /{id}
   ```

---

## Step 2 — Flyway Migration

Create `src/main/resources/db/migration/V<n>__create_<table>_table.sql`:

```sql
CREATE TABLE IF NOT EXISTS <table_name> (
    id          BIGSERIAL PRIMARY KEY,
    -- all domain fields with proper PostgreSQL types:
    --   String      → VARCHAR(255) NOT NULL
    --   Text        → TEXT
    --   BigDecimal  → NUMERIC(19, 2) NOT NULL
    --   Integer     → INTEGER NOT NULL DEFAULT 0
    --   Boolean     → BOOLEAN NOT NULL DEFAULT TRUE
    --   Enum        → VARCHAR(50) NOT NULL
    --   FK          → BIGINT NOT NULL REFERENCES other_table(id)
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
src/main/java/<base_package>/<entity_lower>/
├── <Entity>.java                      ← JPA Entity
├── <Entity>Status.java                ← Enum (if entity has a status)
├── <Entity>Repository.java            ← Spring Data JPA Repository
├── <Entity>Service.java               ← Service interface
├── <Entity>ServiceImpl.java           ← Service implementation
├── <Entity>Controller.java            ← REST Controller
└── dto/
    ├── Create<Entity>Request.java     ← Java record, input for POST
    ├── Update<Entity>Request.java     ← Java record, input for PUT
    └── <Entity>Response.java          ← Java record, output for all endpoints
```

---

## Step 4 — Base Classes (create only if missing)

### `BaseEntity.java`
```java
@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
```

### `ApiResponse<T>.java`
```java
public record ApiResponse<T>(
    boolean success,
    String message,
    T data
) {
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "Success", data);
    }
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }
}
```

### `PageResponse<T>.java`
```java
public record PageResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean last
) {
    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
            page.getContent(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.isLast()
        );
    }
}
```

### `ResourceNotFoundException.java`
```java
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, Long id) {
        super(resource + " not found with id: " + id);
    }
}
```

### `GlobalExceptionHandler.java`
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                f -> Optional.ofNullable(f.getDefaultMessage()).orElse("Invalid value")
            ));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ApiResponse<>(false, "Validation failed", errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error("An unexpected error occurred"));
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
public class <Entity> extends BaseEntity {

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

## Step 7 — DTOs

### `Create<Entity>Request.java` (Java record)
- Include all user-provided fields (no id, no createdAt, no updatedAt)
- Add validation annotations on each field:
  - `@NotBlank` for strings
  - `@NotNull` for objects/enums
  - `@DecimalMin("0.0")` for prices
  - `@Min(0)` for integers
  - `@Size(max = 255)` for strings
  - `@Pattern` for fields like SKU or codes

### `Update<Entity>Request.java` (Java record)
- Same fields as Create, all optional (use wrapper types or `@Nullable`)
- Only non-null fields should be applied on update (patch-style)

### `<Entity>Response.java` (Java record)
- All fields including `id`, `createdAt`, `updatedAt`
- Include a static `from(<Entity> entity)` factory method for mapping

---

## Step 8 — Repository

```java
@Repository
public interface <Entity>Repository extends JpaRepository<<Entity>, Long> {

    // Paging with optional filter by status
    Page<<Entity>> findByStatus(<Entity>Status status, Pageable pageable);

    // Paging all (no filter)
    Page<<Entity>> findAll(Pageable pageable);

    // Find by unique field (e.g., sku) — add if entity has a unique field
    Optional<<Entity>> findBySku(String sku);

    // Check existence by unique field before create/update
    boolean existsBySku(String sku);

    // Soft delete query (if using soft delete)
    @Query("UPDATE <Entity> e SET e.status = 'DELETED' WHERE e.id = :id")
    @Modifying
    void softDeleteById(@Param("id") Long id);
}
```

---

## Step 9 — Service Interface

```java
public interface <Entity>Service {

    <Entity>Response create(Create<Entity>Request request);

    <Entity>Response getById(Long id);

    PageResponse<<Entity>Response> getAll(int page, int size, String sortBy, String sortDir);

    <Entity>Response update(Long id, Update<Entity>Request request);

    void delete(Long id);
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
    public <Entity>Response create(Create<Entity>Request request) {
        // 1. Validate uniqueness (e.g., sku must not already exist)
        // 2. Build entity using builder pattern
        // 3. Save and return mapped response
        log.info("Creating new <entity>: {}", request);
        <Entity> entity = <Entity>.builder()
            // map all fields from request
            .build();
        return <Entity>Response.from(repository.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public <Entity>Response getById(Long id) {
        return <Entity>Response.from(findByIdOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<<Entity>Response> getAll(int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("asc")
            ? Sort.by(sortBy).ascending()
            : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return PageResponse.from(repository.findAll(pageable).map(<Entity>Response::from));
    }

    @Override
    public <Entity>Response update(Long id, Update<Entity>Request request) {
        <Entity> entity = findByIdOrThrow(id);
        // Apply only non-null fields from request (patch-style)
        // e.g., if (request.name() != null) entity.setName(request.name());
        return <Entity>Response.from(repository.save(entity));
    }

    @Override
    public void delete(Long id) {
        <Entity> entity = findByIdOrThrow(id);
        // Use soft delete if entity has status field:
        //   entity.setStatus(<Entity>Status.DELETED);
        //   repository.save(entity);
        // Otherwise hard delete:
        //   repository.delete(entity);
        log.info("Deleted <entity> with id: {}", id);
    }

    private <Entity> findByIdOrThrow(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("<Entity>", id));
    }
}
```

---

## Step 11 — Controller

```java
@RestController
@RequestMapping("/api/v1/<entities>")
@RequiredArgsConstructor
@Tag(name = "<Entity> Management", description = "APIs for managing <entities>")
public class <Entity>Controller {

    private final <Entity>Service service;

    @PostMapping
    @Operation(summary = "Create a new <entity>")
    public ResponseEntity<ApiResponse<<Entity>Response>> create(
            @Valid @RequestBody Create<Entity>Request request) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(ApiResponse.success("Created successfully", service.create(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get <entity> by ID")
    public ResponseEntity<ApiResponse<<Entity>Response>> getById(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(service.getById(id)));
    }

    @GetMapping
    @Operation(summary = "Get all <entities> with pagination")
    public ResponseEntity<ApiResponse<PageResponse<<Entity>Response>>> getAll(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(
            ApiResponse.success(service.getAll(page, size, sortBy, sortDir)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing <entity>")
    public ResponseEntity<ApiResponse<<Entity>Response>> update(
            @PathVariable Long id,
            @Valid @RequestBody Update<Entity>Request request) {
        return ResponseEntity.ok(
            ApiResponse.success("Updated successfully", service.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a <entity>")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## Step 12 — Tests

### Unit Test: `<Entity>ServiceImplTest.java`
Location: `src/test/java/<base_package>/<entity_lower>/`

- Use `@ExtendWith(MockitoExtension.class)`
- Mock `<Entity>Repository`
- Test cases:
  - `create_validRequest_returnsResponse()`
  - `create_duplicateSku_throwsException()` ← if unique field exists
  - `getById_existingId_returnsResponse()`
  - `getById_nonExistingId_throwsResourceNotFoundException()`
  - `getAll_returnsPageResponse()`
  - `update_existingId_updatesFields()`
  - `delete_existingId_deletesEntity()`
  - `delete_nonExistingId_throwsResourceNotFoundException()`

### Integration Test: `<Entity>ControllerTest.java`
Location: `src/test/java/<base_package>/<entity_lower>/`

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
  - `POST /api/v1/<entities>` → 201 Created
  - `POST /api/v1/<entities>` with invalid body → 400 Bad Request
  - `GET /api/v1/<entities>/{id}` existing → 200 OK
  - `GET /api/v1/<entities>/{id}` not found → 404 Not Found
  - `GET /api/v1/<entities>` → 200 OK with pagination fields
  - `PUT /api/v1/<entities>/{id}` → 200 OK
  - `PUT /api/v1/<entities>/{id}` not found → 404 Not Found
  - `DELETE /api/v1/<entities>/{id}` → 204 No Content
  - `DELETE /api/v1/<entities>/{id}` not found → 404 Not Found

---

## Step 13 — Final Verification

Run in this exact order and fix any errors before proceeding to the next step:

```bash
# 1. Compile
./gradlew compile -q

# 2. Unit tests only (fast)
./gradlew test -q --tests "<Entity>ServiceImplTest"

# 3. Integration tests
./gradlew test -q --tests "<Entity>ControllerTest"

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
   DTOs         : Create<Entity>Request.java
                  Update<Entity>Request.java
                  <Entity>Response.java
   Tests        : <Entity>ServiceImplTest.java
                  <Entity>ControllerTest.java

🌐 Endpoints:
   POST    /api/v1/<entities>       → Create
   GET     /api/v1/<entities>/{id}  → Get by ID
   GET     /api/v1/<entities>       → Get all (paged)
   PUT     /api/v1/<entities>/{id}  → Update
   DELETE  /api/v1/<entities>/{id}  → Delete

🧪 Tests: All passed ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```