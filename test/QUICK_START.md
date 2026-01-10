# Quick Start Guide - API Testing

## 🚀 Quick Start (5 Minutes)

### Prerequisites Check

```bash
# Check Python
python3 --version  # Need 3.12+

# Check k6 (optional, for performance tests)
k6 version

# Install if needed (macOS)
brew install k6

# Install if needed (Ubuntu/Debian)
curl -s https://dl.k6.io/key.gpg | sudo apt-key add -
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Setup

```bash
# 1. Navigate to test directory
cd test

# 2. Install Python dependencies
pip install -r config/requirement.txt

# 3. Start your API server (in another terminal)
cd ../api && ./gradlew bootRun
```

### Run Your First Test

```bash
# Integration tests (5 seconds)
pytest tests/integration/api/test_deck_api.py::TestDeckAPI::test_get_all_decks_success -v

# All integration tests (2-3 minutes)
pytest tests/integration/ -v

# Quick performance smoke test (1 minute)
k6 run tests/perf/k6/baseline_load_test.js --duration 1m --vus 10
```

## 📋 Common Commands

### Integration Testing

```bash
# Run all integration tests
pytest tests/integration/ -v

# Run specific test file
pytest tests/integration/api/test_deck_api.py -v

# Run specific test
pytest tests/integration/api/test_deck_api.py::TestDeckAPI::test_create_deck_success -v

# Run tests matching pattern
pytest tests/integration/ -k "deck" -v

# Run with coverage
pytest tests/integration/ --cov=api --cov-report=html -v

# Run in parallel (faster)
pytest tests/integration/ -n auto -v

# Run with detailed output
pytest tests/integration/ -vv -s
```

### Performance Testing with k6

```bash
# Smoke test (1 minute, 10 users)
k6 run tests/perf/k6/baseline_load_test.js --duration 1m --vus 10

# Baseline load test (30 minutes)
k6 run tests/perf/k6/baseline_load_test.js

# Stress test (32 minutes)
k6 run tests/perf/k6/stress_test.js

# Spike test (7 minutes)
k6 run tests/perf/k6/spike_test.js

# Soak test (4 hours - run overnight)
k6 run tests/perf/k6/soak_test.js

# Custom configuration
k6 run tests/perf/k6/baseline_load_test.js \
  --env API_BASE_URL=http://staging.example.com/api/v1/oopsly \
  --env TARGET_RPS=200
```

### Performance Testing with Locust

```bash
# Web UI mode (interactive)
locust -f tests/perf/locustfile.py \
  --host=http://localhost:9009/api/v1/oopsly
# Then open http://localhost:8089

# Headless mode
locust -f tests/perf/locustfile.py \
  --host=http://localhost:9009/api/v1/oopsly \
  --users=100 \
  --spawn-rate=10 \
  --run-time=5m \
  --headless
```

### Using the Test Runner Script

```bash
# Make executable (first time only)
chmod +x run_tests.sh

# Check if API is available
./run_tests.sh check

# Run integration tests
./run_tests.sh integration

# Run performance tests
./run_tests.sh performance smoke        # Quick test
./run_tests.sh performance baseline     # Full test

# Run Locust tests
./run_tests.sh locust 100 10           # 100 users, spawn rate 10

# Run everything
./run_tests.sh all
```

## 🔍 Debugging Failed Tests

### View Detailed Output

```bash
# Show full error traces
pytest tests/integration/ -vv --tb=long

# Show standard output
pytest tests/integration/ -v -s

# Stop at first failure
pytest tests/integration/ -x

# Start debugger on failure
pytest tests/integration/ --pdb
```

### Common Issues

**❌ Connection Refused**
```bash
# Issue: API not running
# Fix: Start the API server
cd api && ./gradlew bootRun
```

**❌ Schema Validation Failed**
```bash
# Issue: API response doesn't match OpenAPI spec
# Fix: Check that OpenAPI spec is up to date
# Validate spec:
python3 -c "import json; json.load(open('../api/src/main/resources/openapi.json'))"
```

**❌ Test Timeout**
```bash
# Issue: Test takes too long
# Fix: Increase timeout in pytest.ini or test code
pytest tests/integration/ --timeout=300  # 5 minutes
```

## 📊 Understanding Test Results

### Integration Test Output

```
tests/integration/api/test_deck_api.py::TestDeckAPI::test_create_deck_success PASSED [ 10%]
tests/integration/api/test_deck_api.py::TestDeckAPI::test_get_all_decks_success PASSED [ 20%]
...
============================= 50 passed in 15.32s ==============================
```

- ✅ `PASSED` - Test succeeded
- ❌ `FAILED` - Test failed (bug detected)
- ⚠️ `SKIPPED` - Test was skipped
- 🔄 `XFAIL` - Expected failure (known issue)

### k6 Performance Output

```
     ✓ get decks status 200
     ✓ create deck status 200

     checks.........................: 100.00% ✓ 5000      ✗ 0
     data_received..................: 15 MB   50 kB/s
     data_sent......................: 5.0 MB  17 kB/s
     http_req_duration..............: avg=125ms min=50ms med=100ms max=500ms p(90)=200ms p(95)=250ms
     http_req_failed................: 0.00%   ✓ 0        ✗ 5000
     http_reqs......................: 5000    16.67/s
     iteration_duration.............: avg=2.1s  min=1.5s  med=2s    max=3s
```

**Key Metrics:**
- `checks`: % of assertions that passed
- `http_req_duration`: Response time percentiles
- `http_req_failed`: % of failed requests
- `http_reqs`: Total requests and RPS

## 🎯 Test Coverage by Endpoint

| Endpoint | Method | Tests | Status |
|----------|--------|-------|--------|
| `/decks` | GET | 1 | ✅ |
| `/decks` | POST | 3 | ✅ |
| `/decks/{id}` | GET | 3 | ✅ |
| `/decks/{id}` | PUT | 2 | ✅ |
| `/decks/{id}` | PATCH | 2 | ✅ |
| `/decks/{deckId}/cards` | GET | 2 | ✅ |
| `/decks/{deckId}/cards` | POST | 3 | ✅ |
| `/decks/{deckId}/cards/{id}` | GET | 2 | ✅ |
| `/decks/{deckId}/cards/{id}` | PUT | 1 | ✅ |
| `/decks/{deckId}/cards/{id}` | PATCH | 1 | ✅ |
| `/decks/{deckId}/cards/difficulty` | PUT | 1 | ✅ |
| `/otp` | POST | 3 | ✅ |
| `/otp/validate` | POST | 4 | ✅ |

**Total Coverage: 13/13 endpoints (100%)**

## 🔧 Configuration

### Environment Variables

```bash
# API Base URL
export API_BASE_URL="http://localhost:9009/api/v1/oopsly"

# Performance test target RPS
export TARGET_RPS=100

# Test timeout (seconds)
export TEST_TIMEOUT=60
```

### Test Markers

```bash
# Run only deck tests
pytest tests/integration/ -m deck

# Run only security tests
pytest tests/integration/ -m security

# Run only read operations
pytest tests/integration/ -m read

# Exclude slow tests
pytest tests/integration/ -m "not slow"
```

## 📈 Continuous Integration

### GitHub Actions Example

```yaml
- name: Run API Tests
  run: |
    cd test
    pytest tests/integration/ -v --junitxml=results.xml
    
- name: Run Performance Smoke Test
  run: |
    cd test
    k6 run tests/perf/k6/baseline_load_test.js --duration 1m --vus 10
```

## 🆘 Getting Help

### Documentation
- [Full README](./README.md)
- [Testing Strategy](./TESTING_STRATEGY.md)
- [OpenAPI Specification](../api/src/main/resources/openapi.json)

### Resources
- [pytest Documentation](https://docs.pytest.org/)
- [k6 Documentation](https://k6.io/docs/)
- [Locust Documentation](https://docs.locust.io/)

### Troubleshooting
1. Check API is running: `curl http://localhost:9009/api/v1/oopsly/decks`
2. Verify dependencies: `pip list | grep pytest`
3. Check logs: `pytest tests/integration/ -v -s`
4. Review test code: `less tests/integration/api/test_deck_api.py`

## 💡 Best Practices

### Writing New Tests

1. **Follow existing patterns**
   ```python
   def test_my_feature_success(api_client, test_data, openapi_spec):
       """Describe what this test validates."""
       response = api_client.get("/endpoint")
       assert response.status_code == 200
   ```

2. **Use fixtures for test data**
   ```python
   @pytest.fixture
   def my_test_data():
       return {"key": "value"}
   ```

3. **Test both success and failure**
   ```python
   def test_endpoint_success(api_client):
       # Happy path
       
   def test_endpoint_not_found(api_client):
       # Error case
   ```

4. **Validate against schema**
   ```python
   schema = get_schema_for_response(openapi_spec, path, method, status)
   is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
   assert is_valid
   ```

### Running Tests Efficiently

1. **Use parallel execution**: `pytest -n auto`
2. **Run relevant tests**: `pytest -k "deck"`
3. **Stop at first failure**: `pytest -x`
4. **Cache test results**: `pytest --lf` (last failed)

## ✅ Daily Workflow

```bash
# 1. Pull latest changes
git pull

# 2. Start API
cd api && ./gradlew bootRun &

# 3. Run tests
cd ../test
pytest tests/integration/ -n auto -v

# 4. Before committing
pytest tests/integration/ -v
./run_tests.sh performance smoke

# 5. Review results
# If all pass: commit your changes
# If any fail: fix and repeat
```

## 🎓 Learning Path

1. **Start here**: Run a single simple test
2. **Understand fixtures**: Read `conftest.py`
3. **Study patterns**: Read `test_deck_api.py`
4. **Try negative tests**: Read security test examples
5. **Explore performance**: Run k6 smoke test
6. **Master workflows**: Study multi-step scenario tests

---

**Need more details?** See [README.md](./README.md) for comprehensive documentation.

**Ready to contribute?** Write new tests following the patterns above!
