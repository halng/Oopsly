---
name: update-feature
description: >
  Modify, refactor, or fix existing functionality in a DDD module.
  Use when the user asks to change, update, rename, refactor, or fix something
  that already exists. Examples: "change Product price to support currency",
  "rename sku to productCode", "fix the update logic in OrderService",
  "refactor ProductController to use a new DTO", "change soft delete logic".
---

## Current state of affected module
!`find src/main/java -type f -name "*.java" | xargs grep -l "$ARGUMENTS" 2>/dev/null | head -10`

## Existing migrations
!`ls -1 src/main/resources/db/migration/ | tail -5`

## Current git status
!`git diff --stat HEAD`

## Existing tests related to change
!`find src/test/java -type f -name "*.java" | xargs grep -l "$ARGUMENTS" 2>/dev/null | head -10`

---

## Instructions

Modify existing functionality as described: `$ARGUMENTS`

**This skill touches existing, working code. Treat every change as a potential breaking change.**
Follow every step carefully. Do not change anything outside the described scope.

---

## Step 1 — Deep Exploration Before Any Change

Read and fully understand the current state:

1. **Find all affected files** — search by class name, method name, field name, or annotation
2. **Map the blast radius** — list every file that imports or depends on what will change
3. **Read all affected files completely** — entity, DTOs, service interface, impl, controller, tests, Flyway migrations
4. **Identify the change type** — classify as one of:
   - `FIELD_RENAME` — renaming a field in entity/DTO
   - `FIELD_TYPE_CHANGE` — changing a field's data type
   - `LOGIC_FIX` — fixing incorrect business logic
   - `LOGIC_REFACTOR` — restructuring without changing behavior
   - `DTO_RESTRUCTURE` — changing request/response shape
   - `ENDPOINT_CHANGE` — changing URL, method, or HTTP status
   - `DEPENDENCY_CHANGE` — swapping a library or injected dependency
   - `CONFIG_CHANGE` — changing application properties or Spring config
   - `PERFORMANCE_FIX` — optimizing a query or algorithm

5. **Print a full impact report before touching anything**:
   ```
   📋 Change Type   : FIELD_RENAME
   🎯 What changes  : rename "sku" → "productCode" in Product module
   
   💥 Blast Radius  :
      Entity        : Product.java — rename field + @Column
      Repository    : ProductRepository.java — update method names + @Query
      ServiceImpl   : ProductServiceImpl.java — update field references
      DTOs          : CreateProductRequest, UpdateProductRequest, ProductResponse
      Tests         : ProductServiceImplTest, ProductControllerTest
      Migration     : YES — rename column in DB
      API Contract  : BREAKING — response field name changes
   
   ⚠️  Risk Level    : HIGH — breaking API change
   🔒 Safe to auto-proceed? NO — waiting for confirmation
   ```

6. **Risk gating**:
   - `LOW` (internal refactor, no API/DB change) → proceed automatically
   - `MEDIUM` (new DB column, non-breaking API addition) → proceed with a warning note
   - `HIGH` (breaking API change, column rename/drop, logic behavior change) → **STOP and ask for explicit confirmation** before proceeding

---

## Step 2 — Create a Rollback Checkpoint

Before making any changes:

```bash
# Show current clean state
git status

# If there are uncommitted changes, remind the user to stash or commit first
git stash list
```

If the working tree is dirty, print:
```
⚠️  There are uncommitted changes in the working tree.
    Recommend running `git stash` before proceeding so changes can be rolled back cleanly.
    Proceed anyway? (continuing assumes yes)
```

---

## Step 3 — Database Migration (if schema changes)

### For FIELD_RENAME (column rename):
```sql
-- V<n>__rename_<old>_to_<new>_in_<table>.sql
ALTER TABLE <table> RENAME COLUMN <old_name> TO <new_name>;
```

### For FIELD_TYPE_CHANGE:
```sql
-- V<n>__change_<col>_type_in_<table>.sql
ALTER TABLE <table>
    ALTER COLUMN <col> TYPE <new_type>
    USING <col>::<new_type>;  -- add USING clause for explicit casting
```

### For adding NOT NULL constraint to existing column:
```sql
-- First backfill nulls, then add constraint
UPDATE <table> SET <col> = <default_value> WHERE <col> IS NULL;
ALTER TABLE <table> ALTER COLUMN <col> SET NOT NULL;
```

### Rules:
- **NEVER** drop a column that has data — use soft deprecation (keep column, stop writing to it)
- **NEVER** rename without a migration — Hibernate will fail on startup
- Always use `IF EXISTS` / `IF NOT EXISTS` guards
- Add a SQL comment explaining WHY the change is being made

---

## Step 4 — Apply Changes Systematically

Work through the blast radius identified in Step 1 in this order:
**Entity → Enum → Repository → DTOs → Service Interface → ServiceImpl → Controller → Tests**

Never skip ahead. Each layer depends on the one before it.

### FIELD_RENAME pattern
Apply these changes consistently across ALL affected files:
- Entity: rename Java field + update `@Column(name = "...")` to match migration
- Repository: rename method names that contain the old field name
- DTOs: rename field in record definition
- ServiceImpl: update all field references
- Controller: nothing usually changes (DTO handles it)
- Tests: update field names in assertions and request builders

### LOGIC_FIX pattern
1. Write a **failing test first** that reproduces the bug
2. Run the test to confirm it fails for the right reason
3. Fix the logic in ServiceImpl
4. Run the test again to confirm it passes
5. Run the full test suite to confirm no regressions

### DTO_RESTRUCTURE pattern
1. Create the **new DTO** alongside the old one (don't delete yet)
2. Update ServiceImpl to use the new DTO
3. Update Controller to use the new DTO
4. Update tests to use the new DTO
5. Only delete the old DTO after confirming everything compiles and tests pass

### LOGIC_REFACTOR pattern
1. Confirm existing tests cover the behavior being refactored
2. If coverage is insufficient, write tests BEFORE refactoring
3. Refactor the code
4. Run tests — behavior must be identical (same inputs → same outputs)
5. Confirm no performance regression (check query count in tests if using Testcontainers)

### ENDPOINT_CHANGE pattern
If changing a URL path or HTTP method:
- Mark the old endpoint as `@Deprecated` with a `@Operation(deprecated = true)` note
- Add the new endpoint alongside it
- Remove the old one only when confirmed safe
- Document the change clearly in the summary

---

## Step 5 — Update Tests

### For every changed behavior, update tests:

**If logic changed** → update assertions to match new expected behavior
**If field renamed** → update all `jsonPath("$.oldName")` → `jsonPath("$.newName")`
**If DTO restructured** → update request builders in tests
**If endpoint URL changed** → update `mockMvc.perform(get("/api/v1/..."))`
**If new exception added** → add test for the new error case

### Run affected tests after each file change (not just at the end):
```bash
# Run just the service test while working on ServiceImpl
./mvnw test -Dtest="<Entity>ServiceImplTest" -q

# Run just the controller test while working on Controller
./mvnw test -Dtest="<Entity>ControllerTest" -q
```

This catches errors early before they compound.

---

## Step 6 — Verify No Regressions

```bash
# 1. Compile — must be clean
./mvnw compile -q

# 2. Run only the changed module's tests
./mvnw test -Dtest="<Entity>ServiceImplTest,<Entity>ControllerTest" -q

# 3. Run the FULL test suite — catch any cross-module regressions
./mvnw verify -q
```

If ANY test outside the changed module fails:
- Do NOT ignore it
- Investigate whether your change broke it
- Fix the regression before finishing

---

## Step 7 — Final Review Checklist

Before reporting done, verify manually:

- [ ] No old field/method names remain anywhere in the changed module
- [ ] No unused imports left behind
- [ ] No `TODO` or `FIXME` comments left from the change
- [ ] Flyway migration version is correct and sequential
- [ ] `@Column` names in entity match the migration column names exactly
- [ ] API response shape is consistent (all endpoints use `ApiResponse<T>`)
- [ ] Lombok annotations still valid after field changes
- [ ] No hard-coded values introduced during the fix

---

## Step 8 — Summary Report

```
✅ Feature Updated: <description of change>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Module        : <Entity>
🔧 Change Type   : <CHANGE_TYPE>
⚠️  Risk Level    : <LOW / MEDIUM / HIGH>

📄 Files Changed :
   Modified      : <list each file and what changed in it>
   Added         : <new files>
   Deleted       : <removed files, if any>

🗄️  Migration     : <filename or "None needed">

🔀 API Changes   :
   <BREAKING: describe what changed and how callers must update>
   <or "None — internal change only">

🧪 Tests         :
   Updated       : <which tests were updated>
   Added         : <new test cases>
   Result        : All passed ✅

💡 Notes         : <any important caveats, follow-up tasks, or things to monitor>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```