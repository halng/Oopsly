# Generic Test Framework - User Guide

## Overview

This enhanced testing framework is fully **generic and config-driven**, automatically generating tests from the OpenAPI specification. No code changes needed when API changes - just update the spec!

## Key Features

### 1. **Auto-Generated Tests** 🤖
Tests are automatically generated from OpenAPI spec:
- No manual test writing for new endpoints
- Mock data generated from schemas
- Supports all HTTP methods

### 2. **Response Recording for WireMock** 📹
Automatically records API responses for stub generation:
- WireMock-compatible format
- Enables API mocking for frontend testing
- No external dependencies during development

### 3. **Config-Driven Performance Tests** ⚙️
Single performance test file configured via settings:
- Adjust endpoint weights in config
- Configure thresholds per endpoint
- No code changes for new endpoints

### 4. **Automatic Report Generation** 📊
Creates timestamped reports per release:
- HTML reports with visual metrics
- JSON reports for CI/CD integration
- Stored in `reports/` folder

## Quick Start

### Generate Tests from OpenAPI Spec

```bash
cd test

# Generate all tests
python3 tests/integration/utils/test_generator.py \
  ../api/src/main/resources/openapi.json \
  tests/integration/generated/

# Run generated tests
pytest tests/integration/generated/ -v
```

### Enable Response Recording

```bash
# Enable WireMock recording
export ENABLE_RECORDING=true

# Run tests (responses saved to wiremock/mappings/)
pytest tests/integration/api/ -v

# Disable recording
unset ENABLE_RECORDING
```

### Run Config-Driven Performance Tests

```bash
# Edit configuration first
vim tests/perf/config/endpoints_config.py

# Run generic performance test
k6 run tests/perf/k6/generic_load_test.js \
  --env TEST_TYPE=baseline \
  --env TARGET_RPS=100

# Available test types: baseline, stress, spike
```

### Generate Test Reports

```bash
# Run tests with JUnit XML output
pytest tests/integration/ --junitxml=test-results.xml

# Generate Markdown, HTML and JSON reports
python3 generate_report.py test-results.xml

# Reports saved to reports/ folder (Markdown is primary format)
ls -la reports/
# test_report_v1.0.0_20250110_143022.md   ← Easy to read in GitHub!
# test_report_v1.0.0_20250110_143022.html
# test_report_v1.0.0_20250110_143022.json
```

**Markdown Report Example:**

```markdown
# Test Report - Release v1.0.0

## 📊 Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Tests** | 44 | 100% |
| **✅ Passed** | 42 | 95.5% |
| **❌ Failed** | 2 | 4.5% |

### 🟢 Pass Rate: 95.5%
```

Reports are version-controlled and easy to review in pull requests!

## Configuration

### Endpoint Performance Config

Edit `tests/perf/config/endpoints_config.py`:

```python
ENDPOINT_CONFIG = {
    "GET /your-endpoint": {
        "weight": 25,  # Percentage of total traffic
        "target_rps": 40,  # Target requests per second
        "thresholds": {
            "p95_latency_ms": 300,
            "p99_latency_ms": 800,
            "error_rate": 0.01
        },
        "generate_data": lambda: {"key": "value"}
    }
}
```

**Parameters:**
- `weight`: Traffic distribution (percentage)
- `target_rps`: Target requests per second
- `thresholds`: Performance SLA thresholds
- `generate_data`: Function to generate request body
- `requires_setup`: Set to "deck_id" if endpoint needs path parameters

### Global Performance Config

```python
PERFORMANCE_CONFIG = {
    "baseline_load": {
        "duration_minutes": 30,
        "total_target_rps": 100,
        "max_vus": 500
    }
}
```

## Directory Structure

```
test/
├── reports/                              # Auto-generated reports
│   ├── test_report_v1.0.0_20250110_143022.html
│   └── test_report_v1.0.0_20250110_143022.json
├── wiremock/                             # WireMock recordings
│   └── mappings/
│       ├── get_decks.json
│       └── post_decks.json
├── tests/
│   ├── integration/
│   │   ├── generated/                    # Auto-generated tests
│   │   │   ├── test_generated_deck_api.py
│   │   │   ├── test_generated_card_api.py
│   │   │   └── test_generated_otp_api.py
│   │   ├── utils/
│   │   │   ├── test_generator.py         # Test generator
│   │   │   ├── response_recorder.py      # WireMock recorder
│   │   │   └── schema_validator.py
│   │   └── conftest.py
│   └── perf/
│       ├── config/
│       │   └── endpoints_config.py       # Performance config
│       └── k6/
│           └── generic_load_test.js      # Generic k6 test
└── generate_report.py                    # Report generator
```

## Usage Examples

### Example 1: Add New Endpoint

When you add a new endpoint to the API:

1. Update `api/src/main/resources/openapi.json`
2. Regenerate tests:
   ```bash
   python3 tests/integration/utils/test_generator.py \
     ../api/src/main/resources/openapi.json \
     tests/integration/generated/
   ```
3. Add performance config (optional):
   ```python
   # In tests/perf/config/endpoints_config.py
   "GET /new-endpoint": {
       "weight": 10,
       "target_rps": 15,
       "thresholds": {"p95_latency_ms": 400}
   }
   ```
4. Run tests:
   ```bash
   pytest tests/integration/generated/test_generated_all_api.py -v
   ```

**That's it! No manual test writing needed.**

### Example 2: Record Responses for Frontend Mocking

```bash
# 1. Enable recording
export ENABLE_RECORDING=true

# 2. Run tests
pytest tests/integration/api/test_deck_api.py -v

# 3. WireMock stubs created in wiremock/mappings/
# 4. Use with WireMock server:
java -jar wiremock-standalone.jar --root-dir=wiremock
```

### Example 3: Generate Release Report

```bash
# Run all tests before release
pytest tests/integration/ -v --junitxml=results.xml

# Generate report
python3 generate_report.py results.xml

# Report saved with release version
# Example: test_report_v1.2.0_20250110_150000.html
```

### Example 4: Tune Performance Test

```bash
# Edit config to adjust load
vim tests/perf/config/endpoints_config.py

# Change weights and thresholds:
ENDPOINT_CONFIG = {
    "GET /decks": {
        "weight": 40,  # Increase from 30 to 40
        "target_rps": 60,  # Increase from 50 to 60
    }
}

# Run test with new config
k6 run tests/perf/k6/generic_load_test.js --env TARGET_RPS=150
```

## Benefits

### Before (Manual Tests)
❌ Write test for each endpoint manually  
❌ Update tests when API changes  
❌ Duplicate code across test files  
❌ Manual response stubbing  
❌ Separate config for each perf test  

### After (Generic Framework)
✅ Tests auto-generated from OpenAPI spec  
✅ Single config file for all endpoints  
✅ Automatic mock data generation  
✅ Automatic response recording  
✅ No code changes for new endpoints  

## Advanced Features

### Custom Mock Data Generators

You can customize how mock data is generated:

```python
# In test_generator.py, modify MockDataGenerator class
@staticmethod
def _generate_string(format_type, schema):
    if format_type == "email":
        return f"custom_{uuid.uuid4()}@company.com"
    # ... other formats
```

### Custom Response Transformations

Transform recorded responses before saving:

```python
# In response_recorder.py
def _build_response(self, response):
    wiremock_response = {
        "status": response.status_code,
        "headers": self._filter_headers(response.headers),
        "jsonBody": self._transform_body(response.json())
    }
    return wiremock_response
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests with Reporting

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Generate Tests
        run: |
          cd test
          python3 tests/integration/utils/test_generator.py \
            ../api/src/main/resources/openapi.json \
            tests/integration/generated/
      
      - name: Run Integration Tests
        run: |
          cd test
          pytest tests/integration/ --junitxml=results.xml
      
      - name: Generate Report
        if: always()
        run: |
          cd test
          python3 generate_report.py results.xml
      
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: test/reports/
```

## Troubleshooting

### Tests Not Generated?

Check OpenAPI spec is valid:
```bash
python3 -c "import json; json.load(open('api/src/main/resources/openapi.json'))"
```

### Performance Test Not Using Config?

Verify config file location:
```bash
ls -la tests/perf/config/endpoints_config.py
```

### Reports Not Generated?

Check reports directory exists:
```bash
mkdir -p test/reports
```

## Migration Guide

### Migrating Existing Tests

1. **Generate new tests**:
   ```bash
   python3 tests/integration/utils/test_generator.py \
     ../api/src/main/resources/openapi.json \
     tests/integration/generated/
   ```

2. **Run both old and new tests**:
   ```bash
   pytest tests/integration/api/ tests/integration/generated/ -v
   ```

3. **Compare results** - they should match

4. **Phase out manual tests** once confident

## Best Practices

1. **Keep OpenAPI Spec Updated**: This is your single source of truth
2. **Version Your Config**: Track changes to `endpoints_config.py`
3. **Review Generated Tests**: Ensure they match expectations
4. **Archive Reports**: Keep historical reports for trend analysis
5. **Use Recording Sparingly**: Only when needed to avoid large stub files

## FAQ

**Q: Do I need to write tests manually anymore?**  
A: No! Tests are auto-generated from OpenAPI spec. Only write custom tests for complex workflows.

**Q: Can I customize generated tests?**  
A: Yes, edit `test_generator.py` to customize generation logic.

**Q: How do I test locally without API running?**  
A: Use recorded WireMock stubs to mock the API.

**Q: What if my endpoint needs complex setup?**  
A: Mark it with `requires_setup` and add setup logic in test generator.

**Q: Can I use this with other APIs?**  
A: Yes! Just point to any OpenAPI 3.x specification.

## Support

For issues or questions:
1. Check this guide first
2. Review generated test files
3. Check OpenAPI spec is valid
4. Raise an issue with logs

---

**Next Steps:**
1. Try generating tests for your API
2. Configure performance test settings
3. Enable recording for one test run
4. Generate your first release report

Happy Testing! 🚀
