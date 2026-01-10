# API Testing Strategy Document

## Executive Summary

This document outlines the comprehensive testing strategy for the Oopsly API, implementing a specification-driven approach that ensures functional correctness, performance resilience, and security compliance. The strategy is grounded in the OpenAPI specification as the deterministic contract between API implementation and consumers.

## 1. Testing Philosophy

### 1.1 Specification-First Approach

The OpenAPI specification (`api/src/main/resources/openapi.json`) serves as the single source of truth. All tests are derived from and validated against this specification, ensuring:

- **Contract Adherence**: Implementation strictly follows the defined schema
- **Automated Coverage**: No endpoint is overlooked
- **Version Synchronization**: Tests automatically adapt to specification changes
- **Documentation Accuracy**: Living documentation that matches reality

### 1.2 Testing Pyramid

```
                    /\
                   /  \
                  / E2E\       ← UI/Integration (Small)
                 /------\
                /  Perf  \     ← Performance Tests (Medium)
               /----------\
              / Integration\   ← API Tests (Large)
             /--------------\
            /   Unit Tests   \  ← Component Tests (Not in scope)
           /------------------\
```

This project focuses on the middle and upper tiers: Integration, Performance, and E2E testing.

## 2. Test Dimensions

### 2.1 Syntactic Correctness

**Objective**: Verify adherence to OpenAPI schema constraints

**Methods**:
- Automated schema validation for all responses
- Type checking (string, integer, UUID, etc.)
- Format validation (email, date-time, UUID)
- Required field presence
- Enum value constraints

**Coverage**:
- All 200 OK responses
- All error responses (400, 404, 500)
- Edge cases (null values, empty arrays)

**Example**:
```python
def test_deck_response_schema(api_client, openapi_spec):
    response = api_client.get("/decks")
    schema = get_schema_for_response(openapi_spec, "/decks", "get", 200)
    is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
    assert is_valid, f"Schema validation failed: {error}"
```

### 2.2 Semantic Integrity

**Objective**: Verify business logic and data persistence

**Methods**:
- Full CRUD cycle testing
- Data consistency validation
- State management verification
- Relationship integrity (deck-card associations)

**Coverage**:
- Create operations persist data
- Read operations return correct data
- Update operations modify existing data
- Delete operations remove data permanently

**Example**:
```python
def test_deck_crud_integrity(api_client):
    # Create
    create_resp = api_client.post("/decks", json={"name": "Test"})
    deck_id = create_resp.json()["data"]["id"]
    
    # Read
    get_resp = api_client.get(f"/decks/{deck_id}")
    assert get_resp.json()["data"]["name"] == "Test"
    
    # Update
    api_client.put(f"/decks/{deck_id}", json={"name": "Updated"})
    
    # Verify update
    verify_resp = api_client.get(f"/decks/{deck_id}")
    assert verify_resp.json()["data"]["name"] == "Updated"
    
    # Delete
    api_client.patch(f"/decks/{deck_id}")
    
    # Verify deletion
    final_resp = api_client.get(f"/decks/{deck_id}")
    assert final_resp.status_code == 404
```

### 2.3 Workflow Continuity

**Objective**: Verify complex multi-step user journeys

**Methods**:
- Scenario-based testing
- State propagation across endpoints
- Transaction integrity
- Error recovery testing

**Coverage**:
- New user onboarding flow
- Study session workflow
- Deck creation with cards
- OTP authentication flow

**Example**:
```python
def test_study_session_workflow(api_client):
    # 1. Authenticate with OTP
    otp_resp = api_client.post("/otp", json={"identifier": "user@test.com"})
    
    # 2. Create deck
    deck_resp = api_client.post("/decks", json={"name": "Study Deck"})
    deck_id = deck_resp.json()["data"]["id"]
    
    # 3. Add cards
    cards_resp = api_client.post(f"/decks/{deck_id}/cards", json={...})
    
    # 4. Update difficulty after studying
    card_id = cards_resp.json()["data"][0]["id"]
    api_client.put(f"/decks/{deck_id}/cards/difficulty", 
                   json={"cardId": card_id, "difficulty": "EASY"})
```

### 2.4 Security Compliance

**Objective**: Verify resistance to attacks and abuse

**Methods**:
- Negative testing with invalid inputs
- Boundary testing (min/max values)
- SQL injection attempts
- XSS payload injection
- Rate limiting verification
- Authentication bypass attempts

**Coverage**:
- OWASP Top 10
- Input validation
- Authentication/Authorization
- Rate limiting
- Error message information disclosure

**Example**:
```python
def test_sql_injection_resistance(api_client):
    # Attempt SQL injection in various parameters
    payloads = [
        "' OR '1'='1",
        "1; DROP TABLE decks--",
        "' UNION SELECT * FROM users--"
    ]
    
    for payload in payloads:
        response = api_client.get(f"/decks/{payload}")
        assert response.status_code in [400, 404], \
            f"SQL injection not properly handled: {payload}"

def test_otp_replay_attack(api_client):
    # Generate OTP
    otp_resp = api_client.post("/otp", json={"identifier": "test@test.com"})
    code = otp_resp.json()["data"]["code"]
    
    # First validation should succeed
    first = api_client.post("/otp/validate", json={"identifier": "test@test.com", "code": code})
    
    # Second validation should fail (replay attack)
    second = api_client.post("/otp/validate", json={"identifier": "test@test.com", "code": code})
    
    assert not (first.status_code == 200 and second.status_code == 200), \
        "OTP replay attack vulnerability detected!"
```

### 2.5 Performance Resilience

**Objective**: Verify stability under load and stress

**Methods**:
- Load testing (baseline capacity)
- Stress testing (breaking point)
- Spike testing (sudden surges)
- Soak testing (long-duration stability)

See [Performance Testing Strategy](#3-performance-testing-strategy) for details.

## 3. Performance Testing Strategy

### 3.1 Test Types Matrix

| Test Type | Duration | Load Profile | Primary Objective |
|-----------|----------|--------------|-------------------|
| **Baseline** | 30 min | Ramping to target | Verify normal capacity |
| **Stress** | 32 min | Gradual increase to failure | Find breaking point |
| **Spike** | 7 min | Sudden 20x surge | Test elasticity |
| **Soak** | 4 hours | Constant moderate | Detect memory leaks |

### 3.2 Baseline Load Test

**Purpose**: Establish performance baseline and verify SLA compliance

**Configuration**:
```javascript
{
  executor: 'ramping-arrival-rate',
  stages: [
    { duration: '5m', target: 100 },   // Ramp up
    { duration: '20m', target: 100 },  // Sustain
    { duration: '5m', target: 10 }     // Ramp down
  ]
}
```

**Success Criteria**:
- P95 latency < 500ms
- P99 latency < 1000ms
- Error rate < 1%
- No 5xx errors
- Throughput sustained at target RPS

**Execution**:
```bash
k6 run tests/perf/k6/baseline_load_test.js \
  --env API_BASE_URL=http://localhost:9009/api/v1/oopsly \
  --env TARGET_RPS=100
```

### 3.3 Stress Test

**Purpose**: Identify capacity limits and failure modes

**Configuration**:
```javascript
{
  executor: 'ramping-vus',
  stages: [
    { duration: '2m', target: 50 },    // Warm up
    { duration: '5m', target: 100 },   // Normal
    { duration: '5m', target: 200 },   // High
    { duration: '5m', target: 400 },   // Stress
    { duration: '5m', target: 600 },   // Breaking point
    { duration: '5m', target: 800 },   // Beyond limits
    { duration: '5m', target: 0 }      // Recovery
  ]
}
```

**Key Observations**:
- At what load does P95 exceed 500ms?
- At what load does error rate exceed 1%?
- What type of errors appear? (503, timeouts, connection refused)
- Does the system recover gracefully?
- Are there resource bottlenecks? (CPU, memory, connections)

**Execution**:
```bash
k6 run tests/perf/k6/stress_test.js \
  --env API_BASE_URL=http://localhost:9009/api/v1/oopsly
```

### 3.4 Spike Test

**Purpose**: Verify resilience to sudden traffic surges

**Configuration**:
```javascript
{
  executor: 'ramping-vus',
  stages: [
    { duration: '1m', target: 10 },    // Normal
    { duration: '10s', target: 500 },  // Spike!
    { duration: '3m', target: 500 },   // Hold
    { duration: '10s', target: 10 },   // Drop
    { duration: '2m', target: 10 }     // Recovery
  ]
}
```

**Key Observations**:
- Do auto-scalers react in time?
- Are there cold start delays?
- Does the system queue requests or reject them?
- How long until full recovery?

**Acceptable Behavior**:
- Temporary latency increase (< 5s)
- Some 503 errors during initial spike (< 10%)
- Full recovery within 1 minute

**Unacceptable Behavior**:
- System crashes
- Extended downtime (> 5 minutes)
- Data corruption
- Persistent errors after recovery

**Execution**:
```bash
k6 run tests/perf/k6/spike_test.js \
  --env API_BASE_URL=http://localhost:9009/api/v1/oopsly
```

### 3.5 Soak Test

**Purpose**: Detect memory leaks and performance degradation over time

**Configuration**:
```javascript
{
  executor: 'constant-vus',
  vus: 50,
  duration: '4h'
}
```

**Key Observations**:
- Does latency increase over time?
- Does memory usage grow unbounded?
- Do connection pools exhaust?
- Are there periodic GC pauses?

**Success Criteria**:
- Latency remains stable (< 5% variance)
- Memory growth < 10% per hour
- No error rate increase
- All metrics stable in final hour

**Monitoring Requirements**:
- Application metrics (heap, GC, threads)
- Database connections
- API latency percentiles
- Error rates by endpoint

**Execution**:
```bash
k6 run tests/perf/k6/soak_test.js \
  --env API_BASE_URL=http://localhost:9009/api/v1/oopsly
```

## 4. Key Performance Indicators (KPIs)

### 4.1 Latency Thresholds

| Percentile | Target | Alert Threshold | Critical Threshold |
|------------|--------|-----------------|-------------------|
| P50 (median) | < 100ms | > 200ms | > 500ms |
| P75 | < 200ms | > 300ms | > 600ms |
| P90 | < 300ms | > 400ms | > 800ms |
| P95 | < 500ms | > 600ms | > 1000ms |
| P99 | < 1000ms | > 1500ms | > 3000ms |

### 4.2 Throughput Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Peak RPS | 1000 | Maximum expected traffic |
| Sustained RPS | 500 | Average daily traffic |
| Minimum RPS | 10 | Off-peak baseline |

### 4.3 Error Budgets

| Period | Allowed Downtime | Error Rate Budget |
|--------|------------------|-------------------|
| Monthly | 43 minutes | 0.1% (99.9% uptime) |
| Weekly | 10 minutes | 0.1% |
| Daily | 1.4 minutes | 0.1% |

## 5. Test Execution Schedule

### 5.1 Continuous Integration

**On Every Commit**:
- Integration test suite (all endpoints)
- Smoke test (1 minute, 10 VUs)

**On Pull Request**:
- Full integration test suite
- Baseline load test (5 minutes)
- Security scan

### 5.2 Scheduled Testing

**Daily** (overnight):
- Full integration test suite
- Baseline load test (30 minutes)
- Smoke performance test

**Weekly** (Sunday):
- Stress test (32 minutes)
- Spike test (7 minutes)
- Security audit

**Monthly**:
- Soak test (4 hours)
- Capacity planning review
- Performance trend analysis

## 6. Test Environment Requirements

### 6.1 Infrastructure

**Integration Testing**:
- Dedicated test environment
- Isolated database
- Mock external services
- Test data fixtures

**Performance Testing**:
- Production-like environment
- Same instance types
- Same auto-scaling configuration
- Real database (non-production)

### 6.2 Data Management

**Test Data**:
- Automated generation from OpenAPI schemas
- Realistic data volumes
- Privacy-compliant (no PII)
- Repeatable seed data

**Cleanup**:
- Automated cleanup after tests
- Namespace isolation (test-*)
- Scheduled purges

## 7. Reporting and Metrics

### 7.1 Test Reports

Each test run produces:
- Test execution summary
- Pass/fail counts
- Coverage metrics
- Performance metrics
- Error logs

### 7.2 Dashboards

**Real-time Monitoring**:
- Active test status
- Current performance metrics
- Error rates
- Resource utilization

**Historical Trends**:
- Latency over time
- Error rate trends
- Throughput capacity
- Test flakiness

## 8. Continuous Improvement

### 8.1 Test Maintenance

- Review test failures weekly
- Update tests with spec changes
- Refactor flaky tests
- Add tests for bugs

### 8.2 Performance Baselines

- Update baselines quarterly
- Document capacity changes
- Adjust thresholds with growth
- Plan infrastructure scaling

### 8.3 Security Updates

- Monitor OWASP advisories
- Add tests for new vulnerabilities
- Regular dependency updates
- Annual security audit

## 9. Success Metrics

### 9.1 Test Quality

- Test coverage: > 90% of endpoints
- Test stability: < 2% flaky tests
- Test execution time: < 5 minutes for integration
- Mean time to detection: < 1 hour

### 9.2 System Quality

- Production incidents: < 1 per month
- P95 latency: < 500ms
- Error rate: < 0.1%
- Deployment frequency: Daily

## 10. Conclusion

This comprehensive testing strategy ensures the Oopsly API meets the highest standards of quality, performance, and security. By treating the OpenAPI specification as the deterministic contract and implementing rigorous testing across all dimensions, we establish confidence that the system will perform reliably in production under all expected (and unexpected) conditions.

The strategy is designed to be maintainable, scalable, and continuously improving, adapting to changes in the system while maintaining high quality standards.
