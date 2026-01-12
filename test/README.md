# API Integration and Performance Testing Suite

## Overview

This comprehensive testing suite implements a specification-driven approach to API quality assurance, based on the OpenAPI specification as the deterministic contract. The suite covers all dimensions of testing required for production-grade API systems.

**✨ New: Docker Integration** - Tests now automatically start and manage Docker services (API + Database + Redis). Just run `./run_tests.sh integration` and everything is handled for you!

## Table of Contents

1. [Test Structure](#test-structure)
2. [Quick Start with Docker](#quick-start-with-docker)
3. [Integration Tests](#integration-tests)
4. [Performance Tests](#performance-tests)
5. [Running the Tests](#running-the-tests)
6. [Performance KPIs and Thresholds](#performance-kpis-and-thresholds)
7. [Continuous Integration](#continuous-integration)

## Quick Start with Docker

### Automatic Mode (Recommended)

```bash
# Just run tests - Docker auto-manages everything!
cd test
./run_tests.sh integration

# What happens:
# 1. Docker starts PostgreSQL, Redis, and API server
# 2. Tests run against real API at http://localhost:9009
# 3. Docker services automatically stop after tests
```

### Manual Mode

```bash
# Start services manually
./setup_test_environment.sh up

# Run tests (Docker won't auto-start/stop)
USE_DOCKER=false pytest tests/integration/ -v

# Stop services
./setup_test_environment.sh down
```

**See [DOCKER_INTEGRATION_GUIDE.md](DOCKER_INTEGRATION_GUIDE.md) for complete Docker documentation.**

## Test Structure

```
test/
├── tests/
│   ├── integration/           # API Integration Tests
│   │   ├── api/               # Endpoint-specific tests
│   │   │   ├── test_deck_api.py
│   │   │   ├── test_card_api.py
│   │   │   ├── test_otp_api.py
│   │   │   └── test_generic_api.py  # Runtime parameterized tests
│   │   ├── utils/             # Test utilities
│   │   │   ├── schema_validator.py
│   │   │   ├── response_recorder.py  # WireMock integration
│   │   │   └── test_generator.py
│   │   └── conftest.py        # Test fixtures + Docker management
│   ├── perf/                  # Performance Tests
│   │   ├── k6/                # K6 load tests
│   │   │   ├── baseline_load_test.js
│   │   │   ├── stress_test.js
│   │   │   ├── spike_test.js
│   │   │   ├── soak_test.js
│   │   │   ├── generic_load_test.js  # Config-driven
│   │   │   └── report_generator.js   # K6-reporter integration
│   │   ├── config/
│   │   │   └── endpoints_config.py   # Performance config
│   │   └── locustfile.py      # Locust tests
│   └── e2e/                   # End-to-end UI tests
├── config/
│   └── requirement.txt        # Python dependencies
├── docker-compose.test.yml    # Docker services for testing
├── setup_test_environment.sh  # Docker management script
├── generate_report.py         # Report generation (Markdown/HTML/JSON)
├── reports/                   # Auto-generated test reports
├── K6_REPORTER_GUIDE.md       # K6 reporter documentation
└── pytest.ini                 # Pytest configuration
```

## Integration Tests

### Test Dimensions

The integration test suite covers five critical dimensions:

| Dimension | Objective | Approach |
|-----------|-----------|----------|
| **Syntactic Correctness** | Verify adherence to OpenAPI schema | Automated schema validation |
| **Semantic Integrity** | Verify business logic and CRUD operations | Stateful integration tests |
| **Workflow Continuity** | Verify complex multi-endpoint journeys | Scenario-based testing |
| **Security Compliance** | Verify resistance to attacks | Negative testing, fuzzing |
| **Performance Resilience** | Verify stability under load | Load and stress testing |

### Running Integration Tests

```bash
# Navigate to test directory
cd test

# Install dependencies
pip install -r config/requirement.txt

# Run all integration tests
pytest tests/integration/ -v

# Run specific test suite
pytest tests/integration/api/test_deck_api.py -v

# Run with coverage
pytest tests/integration/ --cov=api --cov-report=html

# Run tests by tag
pytest tests/integration/ -m "deck" -v
```

### Environment Configuration

Set the API base URL:

```bash
export API_BASE_URL="http://localhost:9009/api/v1/oopsly"
```

### Test Coverage

The integration tests cover all 13 API endpoints:

#### Deck Endpoints (5)
- `GET /decks` - Retrieve all decks
- `POST /decks` - Create new deck
- `GET /decks/{id}` - Get deck by ID
- `PUT /decks/{id}` - Update deck
- `PATCH /decks/{id}` - Delete deck

#### Card Endpoints (6)
- `GET /decks/{deckId}/cards` - Get all cards in deck
- `POST /decks/{deckId}/cards` - Create cards
- `GET /decks/{deckId}/cards/{id}` - Get card by ID
- `PUT /decks/{deckId}/cards/{id}` - Update card
- `PATCH /decks/{deckId}/cards/{id}` - Delete card
- `PUT /decks/{deckId}/cards/difficulty` - Update card difficulty

#### OTP Endpoints (2)
- `POST /otp` - Generate OTP
- `POST /otp/validate` - Validate OTP

### Test Patterns

#### 1. Happy Path Tests
Verify normal operation with valid inputs:
```python
def test_create_deck_success(api_client, test_deck_data):
    response = api_client.post("/decks", json=test_deck_data)
    assert response.status_code == 200
```

#### 2. Negative Tests
Test error handling with invalid inputs:
```python
def test_get_deck_by_id_not_found(api_client):
    response = api_client.get(f"/decks/{uuid.uuid4()}")
    assert response.status_code == 404
```

#### 3. Workflow Tests
Test multi-step user journeys:
```python
def test_complete_deck_lifecycle(api_client):
    # Create -> Read -> Update -> Delete -> Verify
```

## Performance Tests

### Test Types and Objectives

#### 1. Baseline Load Test
**Objective:** Verify system handles expected daily traffic  
**Tool:** k6, Locust  
**Duration:** 30 minutes (5m ramp-up + 20m steady + 5m ramp-down)  
**Profile:** Ramping arrival rate to target RPS  

```bash
# K6
k6 run tests/perf/k6/baseline_load_test.js \
  --env API_BASE_URL=http://localhost:9009/api/v1/oopsly \
  --env TARGET_RPS=100

# Locust
locust -f tests/perf/locustfile.py \
  --host=http://localhost:9009/api/v1/oopsly \
  --users=100 --spawn-rate=10 --run-time=30m
```

#### 2. Stress Test (Capacity Planning)
**Objective:** Identify system breaking point  
**Duration:** 32 minutes  
**Profile:** Gradually increase load beyond capacity  

```bash
k6 run tests/perf/k6/stress_test.js \
  --env API_BASE_URL=http://localhost:9009/api/v1/oopsly
```

Stages:
- 2m: 50 VUs (warm-up)
- 5m: 100 VUs (normal)
- 5m: 200 VUs (high)
- 5m: 400 VUs (stress)
- 5m: 600 VUs (breaking point)
- 5m: 800 VUs (beyond limits)
- 5m: 0 VUs (recovery)

#### 3. Spike Test (Resilience)
**Objective:** Test sudden traffic surges  
**Duration:** 7 minutes  
**Profile:** Sudden jump from 5% to 300% load  

```bash
k6 run tests/perf/k6/spike_test.js \
  --env API_BASE_URL=http://localhost:9009/api/v1/oopsly
```

#### 4. Soak Test (Endurance)
**Objective:** Detect memory leaks and degradation  
**Duration:** 4 hours  
**Profile:** Constant moderate load  

```bash
k6 run tests/perf/k6/soak_test.js \
  --env API_BASE_URL=http://localhost:9009/api/v1/oopsly
```

### Performance KPIs and Thresholds

| Metric | Target | Threshold | Test Type |
|--------|--------|-----------|-----------|
| **P95 Latency** | < 500ms | < 500ms | Baseline, Soak |
| **P99 Latency** | < 1000ms | < 1000ms | Baseline, Soak |
| **Error Rate** | < 0.1% | < 1% | All tests |
| **Throughput** | Target RPS | Sustained | Baseline |
| **Request Success** | > 99% | > 99% | Baseline, Soak |
| **Memory Growth** | Stable | < 10%/hour | Soak |
| **Connection Reuse** | > 90% | > 80% | All tests |

### Performance Test Reports

**✨ K6-Reporter Integration**: All k6 tests now automatically generate comprehensive reports in three formats:

```bash
# Run any k6 test - reports generated automatically!
k6 run tests/perf/k6/baseline_load_test.js

# Output files in reports/ directory:
# - k6_baseline_report_*.html   (Beautiful visual report)
# - k6_baseline_report_*.md     (GitHub-friendly Markdown)
# - k6_baseline_report_*.json   (Machine-readable data)
```

**Report Features:**
- 📊 **HTML**: Interactive charts, color-coded metrics, visual timeline
- 📄 **Markdown**: GitHub-rendered tables with status indicators (✅❌🟢🔴)
- 📋 **JSON**: Complete test data for CI/CD integration
- ✅ **Threshold Compliance**: Automatic pass/fail determination
- 💡 **Recommendations**: Automated suggestions based on results

**See [K6_REPORTER_GUIDE.md](K6_REPORTER_GUIDE.md) for complete k6-reporter documentation.**

### Integration Test Reports

k6 generates detailed reports including:
- Request rate (RPS)
- Response time percentiles (P50, P90, P95, P99)
- Error rates
- Data transfer metrics
- Custom metrics (deck creation time, etc.)

Export results for analysis:
```bash
k6 run tests/perf/k6/baseline_load_test.js --out json=results.json
k6 run tests/perf/k6/baseline_load_test.js --out influxdb=http://localhost:8086
```

## Running the Tests

### Prerequisites

1. **Python 3.12+** (for integration tests)
2. **k6** (for performance tests)
3. **Locust** (alternative performance tool)
4. **Running API server** at `http://localhost:9009`

### Installation

```bash
# Python dependencies
cd test
pip install -r config/requirement.txt

# k6 installation (macOS)
brew install k6

# k6 installation (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Quick Start

```bash
# 1. Start the API server (in separate terminal)
cd api && ./gradlew bootRun

# 2. Run integration tests
cd test
pytest tests/integration/ -v

# 3. Run baseline performance test (short version)
k6 run tests/perf/k6/baseline_load_test.js \
  --duration 5m \
  --vus 50
```

### Parallel Test Execution

Integration tests support parallel execution:

```bash
# Run with 4 workers
pytest tests/integration/ -n 4

# Run with auto-detected CPU count
pytest tests/integration/ -n auto
```

## Continuous Integration

### GitHub Actions Integration

```yaml
name: API Testing

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          cd test
          pip install -r config/requirement.txt
      - name: Run integration tests
        run: |
          cd test
          pytest tests/integration/ -v --junitxml=test-results.xml
      - name: Publish test results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: test/test-results.xml
  
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run smoke test
        run: |
          cd test
          k6 run tests/perf/k6/baseline_load_test.js --duration 1m --vus 10
```

## Best Practices

### 1. Test Data Management
- Use fixtures for reusable test data
- Clean up created resources after tests
- Use unique identifiers to avoid conflicts

### 2. Schema Validation
- Always validate responses against OpenAPI schema
- Report schema violations as test failures
- Keep OpenAPI spec synchronized with implementation

### 3. Error Handling
- Test both success and failure scenarios
- Verify proper HTTP status codes
- Check error response formats

### 4. Performance Testing
- Start with smoke tests (short, low load)
- Gradually increase to full load tests
- Monitor system metrics during tests
- Run soak tests on staging environments

### 5. Security Testing
- Test authentication and authorization
- Validate input sanitization
- Test rate limiting
- Check for common vulnerabilities (OWASP Top 10)

## Troubleshooting

### Integration Tests

**Issue:** Tests fail with connection refused  
**Solution:** Ensure API server is running on the correct port

**Issue:** Schema validation fails  
**Solution:** Verify OpenAPI spec is up-to-date and JSON is valid

### Performance Tests

**Issue:** k6 reports high error rates  
**Solution:** Check API server logs, verify capacity, reduce load

**Issue:** Tests timeout  
**Solution:** Increase timeout thresholds or reduce concurrent users

## Contributing

When adding new tests:

1. Follow existing test patterns and naming conventions
2. Add docstrings explaining test objectives
3. Update this README with new test coverage
4. Ensure tests are idempotent and don't depend on execution order
5. Add appropriate tags for test categorization

## References

- [OpenAPI Specification](https://swagger.io/specification/)
- [k6 Documentation](https://k6.io/docs/)
- [Locust Documentation](https://docs.locust.io/)
- [Pytest Documentation](https://docs.pytest.org/)
- [API Testing Best Practices](https://www.postman.com/api-testing-best-practices/)
