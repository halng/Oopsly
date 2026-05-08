### Phase 1: Inception & Definition (The "What" and "Why")

**Agent:** `oopsly-agent-business-analyst`
1.  **The Input:** You drop a raw idea into Cursor (e.g., "I want a feature where users can track their daily habits and see a weekly summary").
2.  **The Action:** The Business Analyst asks clarifying questions, breaks the idea down into an Agile Epic, and generates specific User Stories with Behavior-Driven Development (BDD) Acceptance Criteria.
3.  **The Output:** A markdown file containing the requirements and strict "Definition of Done."

### Phase 2: High-Level Strategy (The "Where" and "Who")
**Agents:** `oopsly-agent-architect`, `oopsly-agent-ux-designer`, `oopsly-agent-risk-analyzer`
1.  **The Input:** You feed the Business Analyst's requirements to this trio.
2.  **The Action:**
    *   The **Architect** decides if this needs a new Java microservice or can be added to an existing Java/Spring Boot service. They draft an ADR and update the C4 model.
    *   The **UX Designer** sketches the React-Native component tree, focusing on reducing cognitive load for the user journey.
    *   The **Risk Analyzer** reviews the Architect's plan to ensure no new data privacy vulnerabilities or IAM policy gaps are introduced.
3.  **The Output:** Approved ADRs, UI/UX workflows, and a security green light.

### Phase 3: Contract & Data Design (The "Exact Details")
**Agent:** `oopsly-agent-solution-designer`
1.  **The Input:** The requirements from Phase 1 and the Architecture from Phase 2.
2.  **The Action:** The Solution Designer acts as the translator. They design the exact PostgreSQL tables. They write the OpenAPI/Swagger JSON specifications that will dictate exactly how the React-Native frontend will talk to the backend.
3.  **The Output:** Database schema files (`.sql` or migration scripts) and API contracts.

### Phase 4: Implementation & Verification (The "Build")
**Agents:** `oopsly-agent-engineer`, `oopsly-agent-tester`
1.  **The Input:** The strict API contracts, database schemas, and UI designs.
2.  **The Action:**
    *   The **Engineer** writes the actual production code. Because the contracts are already defined, they don't have to guess how the API should look. They just implement the logic in Java or build the UI in React-Native.
    *   Simultaneously (or immediately after), the **Tester** reads the Acceptance Criteria and writes the Cypress E2E tests and JUnit integration tests to hit that 85% coverage mark.
3.  **The Output:** Working application code and a passing test suite.

### Phase 5: Quality Gate & Polish (The "Review")
**Agents:** `oopsly-agent-code-reviewer`, `oopsly-agent-documentation`
1.  **The Input:** The completed pull request from the Engineer and Tester.
2.  **The Action:**
    *   The **Code Reviewer** scans the code for idiomatic standards (Google Java Style), security flaws, and performance bottlenecks. You iterate with the Engineer until the Reviewer approves.
    *   Finally, the **Documentation Specialist** sweeps through the new feature, updating the central `README.md`, polishing the Swagger docs for any newly exposed endpoints, and adding notes to the runbook if new infrastructure was deployed.
3.  **The Output:** Clean, merged code and an updated developer portal.