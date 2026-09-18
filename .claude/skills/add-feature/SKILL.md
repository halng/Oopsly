---
name: add-feature
description: >
  Add a new feature or capability to an existing DDD module.
  Use when the user asks to add something new to an existing entity or module,
  such as: "add search to Product", "add bulk delete to Order",
  "add export CSV to Invoice", "add status change to User",
  "add filter by category to Product", "add soft delete to Order".
---

## Working directory for Backend (Java / Spring Boot)
- Base Path: `app/api`
- All work is done in the `src/main/java` and `src/test/java` directories

## Target module files
!`find app/api/src/main/java -type d | grep -i "$ARGUMENTS" | head -5`

## Existing migrations
!`ls -1 app/api/src/main/resources/db/migration/ | tail -5`

## Current test files
!`find app/api/src/test/java -type f -name "*.java" | grep -i "$ARGUMENTS" | head -10`

---

## Instructions

Add a new feature to an existing module. Feature request: `$ARGUMENTS`

Follow every step in order. Do not modify unrelated code.

---

## Step 1 — Understand the Request & Explore

Before writing any code:

1. **Parse the request**: identify
   - The **target module** (e.g., `product`, `order`)
   - The **feature type** — classify it as one of:
     - `SEARCH_FILTER` — add filtering/search params to GET all
     - `BULK_OPERATION` — bulk create/update/delete
     - `STATUS_TRANSITION` — change entity state (e.g., activate, deactivate, approve)
     - `RELATIONSHIP` — add a relationship to another entity (e.g., Product → Category)
     - `EXPORT` — export data (CSV, Excel, PDF)
     - `EXTRA_ENDPOINT` — a new specific endpoint (e.g., GET /by-sku, POST /duplicate)
     - `COMPUTED_FIELD` — add a derived/calculated field to the response
     - `OTHER` — anything else

2. **Read ALL existing files** in the target module:
   - Entity, Repository, Service interface, ServiceImpl, Controller, all DTOs
   - Existing tests

3. **Print an impact plan** before making any changes:
   ```
   🔍 Feature Type  : SEARCH_FILTER
   🎯 Target Module : Product
   📋 What changes  :
      - Repository  : add findByNameContainingAndStatus() query method
      - Service     : add filter params to getAll()
      - Controller  : add @RequestParam name, status to GET /
      - DTOs        : add ProductFilterRequest record
      - Migration   : needed? NO (no schema change)
      - Tests       : update ProductServiceImplTest + ProductControllerTest
   ⚠️  Risk         : LOW — only adding, not modifying existing logic
   ```

4. **Wait for confirmation** only if the risk is HIGH or BREAKING.
   For LOW/MEDIUM risk, proceed automatically.

---

## Step 2 — Database Migration (if needed)

Only create a migration if the feature requires a schema change:
- New column on existing table
- New join/pivot table
- New index for new query pattern

If needed, create `V<n>__<description>.sql`:
```sql
-- Example: adding a category_id FK to products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES categories(id);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
```

Rules:
- Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (never DROP or rename existing columns)
- Always add indexes for new FK or filter columns
- Use `TIMESTAMPTZ` for any new timestamp columns
- Never modify existing columns in a way that could break existing data

---

## Step 3 — Implement by Feature Type

Apply the right pattern based on the feature type identified in Step 1:

### SEARCH_FILTER
**Repository** — add query method:
```java
// Option A: Spring Data derived query (simple cases)
Page<Product> findByNameContainingIgnoreCaseAndStatus(
    String name, ProductStatus status, Pageable pageable);

// Option B: @Query with JPQL (complex filters)
@Query("""
    SELECT p FROM Product p
    WHERE (:name IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%')))
    AND   (:status IS NULL OR p.status = :status)
    AND   (:minPrice IS NULL OR p.price >= :minPrice)
    AND   (:maxPrice IS NULL OR p.price <= :maxPrice)
    """)
Page<Product> findWithFilters(
    @Param("name") String name,
    @Param("status") ProductStatus status,
    @Param("minPrice") BigDecimal minPrice,
    @Param("maxPrice") BigDecimal maxPrice,
    Pageable pageable);
```

**New DTO** — `ProductFilterRequest.java` (Java record):
```java
public record ProductFilterRequest(
    String name,
    ProductStatus status,
    BigDecimal minPrice,
    BigDecimal maxPrice,
    @Min(0) int page,
    @Min(1) @Max(100) int size,
    String sortBy,
    String sortDir
) {
    // Compact constructor with defaults
    public ProductFilterRequest {
        if (page < 0) page = 0;
        if (size <= 0) size = 10;
        if (sortBy == null) sortBy = "createdAt";
        if (sortDir == null) sortDir = "desc";
    }
}
```

**Service interface** — update `getAll()` signature:
```java
PageResponse<ProductResponse> getAll(ProductFilterRequest filter);
```

**ServiceImpl** — update implementation:
```java
@Override
@Transactional(readOnly = true)
public PageResponse<ProductResponse> getAll(ProductFilterRequest filter) {
    Sort sort = filter.sortDir().equalsIgnoreCase("asc")
        ? Sort.by(filter.sortBy()).ascending()
        : Sort.by(filter.sortBy()).descending();
    Pageable pageable = PageRequest.of(filter.page(), filter.size(), sort);
    return PageResponse.from(
        repository.findWithFilters(
            filter.name(), filter.status(),
            filter.minPrice(), filter.maxPrice(),
            pageable
        ).map(ProductResponse::from)
    );
}
```

**Controller** — update GET / endpoint:
```java
@GetMapping
@Operation(summary = "Get all products with filters and pagination")
public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> getAll(
        @ParameterObject @ModelAttribute ProductFilterRequest filter) {
    return ResponseEntity.ok(ApiResponse.success(service.getAll(filter)));
}
```

---

### BULK_OPERATION
**New DTO** — `BulkDeleteRequest.java`:
```java
public record BulkDeleteRequest(
    @NotEmpty @Size(max = 100) List<@NotNull Long> ids
) {}
```

**Service interface** — add method:
```java
BulkOperationResponse bulkDelete(BulkDeleteRequest request);
```

**New response DTO** — `BulkOperationResponse.java`:
```java
public record BulkOperationResponse(
    int requested,
    int succeeded,
    int failed,
    List<Long> failedIds
) {}
```

**ServiceImpl**:
```java
@Override
public BulkOperationResponse bulkDelete(BulkDeleteRequest request) {
    List<Long> failedIds = new ArrayList<>();
    for (Long id : request.ids()) {
        try {
            delete(id); // reuse existing delete logic
        } catch (ResourceNotFoundException e) {
            failedIds.add(id);
        }
    }
    return new BulkOperationResponse(
        request.ids().size(),
        request.ids().size() - failedIds.size(),
        failedIds.size(),
        failedIds
    );
}
```

**Controller** — add endpoint:
```java
@DeleteMapping("/bulk")
@Operation(summary = "Bulk delete products")
public ResponseEntity<ApiResponse<BulkOperationResponse>> bulkDelete(
        @Valid @RequestBody BulkDeleteRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success("Bulk delete completed", service.bulkDelete(request)));
}
```

---

### STATUS_TRANSITION
**New DTO** — `ChangeStatusRequest.java`:
```java
public record ChangeStatusRequest(
    @NotNull ProductStatus status
) {}
```

**Service interface**:
```java
ProductResponse changeStatus(Long id, ChangeStatusRequest request);
```

**ServiceImpl**:
```java
@Override
public ProductResponse changeStatus(Long id, ChangeStatusRequest request) {
    Product product = findByIdOrThrow(id);
    validateStatusTransition(product.getStatus(), request.status()); // guard invalid transitions
    product.setStatus(request.status());
    log.info("Product {} status changed: {} → {}", id, product.getStatus(), request.status());
    return ProductResponse.from(repository.save(product));
}

private void validateStatusTransition(ProductStatus from, ProductStatus to) {
    // Define allowed transitions — customize per domain
    Map<ProductStatus, Set<ProductStatus>> allowed = Map.of(
        ProductStatus.ACTIVE,   Set.of(ProductStatus.INACTIVE),
        ProductStatus.INACTIVE, Set.of(ProductStatus.ACTIVE, ProductStatus.DELETED),
        ProductStatus.DELETED,  Set.of() // terminal state
    );
    if (!allowed.getOrDefault(from, Set.of()).contains(to)) {
        throw new IllegalStateException(
            "Cannot transition from " + from + " to " + to);
    }
}
```

**Controller**:
```java
@PatchMapping("/{id}/status")
@Operation(summary = "Change product status")
public ResponseEntity<ApiResponse<ProductResponse>> changeStatus(
        @PathVariable Long id,
        @Valid @RequestBody ChangeStatusRequest request) {
    return ResponseEntity.ok(
        ApiResponse.success("Status updated", service.changeStatus(id, request)));
}
```

---

### RELATIONSHIP
If adding a relationship (e.g., Product → Category):
1. Create migration to add FK column
2. Add `@ManyToOne @JoinColumn` to entity
3. Add the related entity's ID and name to the Response DTO
4. Update `Create` and `Update` request DTOs to accept the related ID
5. In ServiceImpl, fetch the related entity by ID before building/updating
6. Add a repository query to filter by relationship if needed

---

### EXPORT
**Controller** — add export endpoint:
```java
@GetMapping("/export/csv")
@Operation(summary = "Export products to CSV")
public void exportCsv(HttpServletResponse response) throws IOException {
    response.setContentType("text/csv");
    response.setHeader("Content-Disposition", "attachment; filename=products.csv");
    service.exportCsv(response.getWriter());
}
```

**ServiceImpl**:
```java
@Override
@Transactional(readOnly = true)
public void exportCsv(Writer writer) throws IOException {
    // Write header
    writer.write("ID,Name,SKU,Price,Status,CreatedAt\n");
    // Stream in batches to avoid OOM
    Pageable pageable = PageRequest.of(0, 500, Sort.by("id").ascending());
    Page<Product> page;
    do {
        page = repository.findAll(pageable);
        for (Product p : page.getContent()) {
            writer.write(String.format("%d,%s,%s,%s,%s,%s\n",
                p.getId(), p.getName(), p.getSku(),
                p.getPrice(), p.getStatus(), p.getCreatedAt()));
        }
        pageable = pageable.next();
    } while (!page.isLast());
}
```

---

## Step 4 — Update GlobalExceptionHandler (if needed)

If the feature introduces a new exception type (e.g., `IllegalStateException` for invalid status transition):

```java
@ExceptionHandler(IllegalStateException.class)
public ResponseEntity<ApiResponse<Void>> handleIllegalState(IllegalStateException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiResponse.error(ex.getMessage()));
}
```

---

## Step 5 — Write Tests for the New Feature Only

### Unit Test additions in `<Entity>ServiceImplTest.java`
Add test methods for the new feature. Do NOT rewrite existing tests:
- Happy path
- Edge cases (empty list, invalid status transition, not found)
- Boundary conditions (bulk with 0 ids, max size exceeded)

### Integration Test additions in `<Entity>ControllerTest.java`
Add MockMvc test methods for new endpoints:
- Success cases with correct HTTP status
- Validation failure cases → 400
- Not found cases → 404
- Conflict cases (invalid transition) → 409

---

## Step 6 — Final Verification

```bash
# Compile
./gradlew compile -q

# Run only tests for this module
./gradlew test -q --tests "<Entity>ServiceImplTest" --tests "<Entity>ControllerTest"

# Full build
./gradlew build -q
```

Fix ALL failures before finishing.

---

## Step 7 — Summary Report

```
✅ Feature Added: <feature description>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Module        : <Entity>
🔧 Feature Type  : <FEATURE_TYPE>

📄 Files Changed :
   Modified      : <list of modified files>
   Added         : <list of new files>

🌐 New Endpoints (if any):
   <METHOD> /api/v1/<entities>/...

🗄️  Migration     : <filename or "None needed">
🧪 Tests         : All passed ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```