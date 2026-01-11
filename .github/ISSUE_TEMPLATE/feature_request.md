---
name: Feature Request
about: Comprehensive template with Context, UI, API, and strict constraints
title: 'OOPS: <Title>'
labels: 'new'
assignees: 'halng'
---

## 1. Context & User Story

- **As a:** [e.g., Administrator]
- **I want to:** [e.g., view a list of all active users]
- **When:** [e.g., I click the "User Management" tab on the dashboard]
- **So that:** [e.g., I can audit who has access to the system]

---

## 2. Technical Specifications

### 📡 API / Backend (If applicable)

- **Endpoint:** `[METHOD] /api/path/to/resource`
- **Request Body (JSON):**
  
  ```json
  {
    "key": "value",
    "filter": "active"
  }
  ```

- **Expected Response (200 OK):**
  
  ```json
  {
    "data": [],
    "total": 0
  }
  ```

- **Error Handling:**

  - 400: Invalid Input
  - 401: Unauthorized
  - ...

### 🎨 Frontend / UI (If applicable)

- **Target Component** `[e.g., UserListTable.tsx]`
- **Visual Elements:**

  - [ ] Loading State (Skeleton or Spinner)
  - [ ] Empty State (Message when no data found)
  - [ ] Error State (Toast notification or banner)

- **User Interactions:**
  - [e.g., Clicking a row navigates to details page]
  - [e.g., Hovering over status shows tooltip]

- **Mock Data needed?** [Yes/No]

---

## 3. Acceptance Criteria

- [ ] **Functionality:** The feature works exactly as described in the User Story.
- [ ] **Validation:** Inputs are validated (client-side AND server-side).
- [ ] **Tests:** Unit tests are written and passing.
- [ ] **Linting:** Code follows the project's linting rules (no warnings).
- [ ] **Responsiveness:** UI looks good on Mobile and Desktop (if UI task).

---

## 4.  Constraints & Rules

### A. Strict Coding Standards

1. **No Placeholders:** Do **not** generate comments like `// TODO: Implement logic`. You must write the full, working implementation.
2. **No Dead Code:** Do not leave `console.log` (JS) or `System.out.println` (Java) in the final code. Use a proper Logger.
3. **Type Safety:**

   - If TypeScript: No `any` types. Define Interfaces/Types.
   - If Java: Use proper Generics and avoid raw types.

4. **Error Handling:** Wrap risky operations (API calls, DB queries) in `try/catch` blocks and handle specific errors, not just generic `Exception`.

### B. Testing Requirement

**You are required to generate a test file for the code you write.**

- **Happy Path:** Test the standard success scenario.
- **Edge Cases:** Test for `null`, `undefined`, empty arrays, or invalid IDs...
