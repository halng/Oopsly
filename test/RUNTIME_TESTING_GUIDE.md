# Generic Runtime Testing Guide

## Overview

The test framework now uses **runtime parameterization** - similar to generics in Java. Instead of generating separate test files, we have **one generic test implementation** that dynamically reads the OpenAPI spec and creates test instances for all endpoints.

## How It Works

### Like Generics in Java

```java
// In Java, you'd write:
class GenericTest<T> {
    void test(T endpoint) {
        // Single implementation, works for any type
    }
}
```

```python
# In Python with pytest:
class TestDynamicAPI:
    def test_endpoint(self, api_client, openapi_spec, endpoint_config):
        # Single implementation, pytest creates instances for all endpoints
        method, path, operation = endpoint_config
        # ... test logic works for any endpoint
```

## Usage

### Run All Endpoint Tests (No Generation Needed!)

```bash
# Just run pytest - it automatically discovers all endpoints from OpenAPI spec
cd test
pytest tests/integration/api/test_generic_api.py -v

# Example output:
# test_generic_api.py::TestDynamicAPI::test_endpoint[GET_/decks] PASSED
# test_generic_api.py::TestDynamicAPI::test_endpoint[POST_/decks] PASSED
# test_generic_api.py::TestDynamicAPI::test_endpoint[GET_/decks/{id}] PASSED
# ... (one test per endpoint in OpenAPI spec)
```

### With Response Recording

```bash
# Enable WireMock recording
ENABLE_RECORDING=true pytest tests/integration/api/test_generic_api.py -v

# Responses saved to wiremock/mappings/
ls wiremock/mappings/
# get_decks.json
# post_decks.json
# ...
```

## Key Benefits

### Before (Code Generation Approach)
❌ Generate test files first  
❌ Extra step before running tests  
❌ Generated files to maintain  
❌ Re-generate when spec changes  

### After (Runtime Parameterization)
✅ **No generation step** - just run pytest  
✅ **Single test implementation** - one place to maintain  
✅ **Automatic discovery** - pytest finds all endpoints from spec  
✅ **Dynamic** - automatically adapts to spec changes  

## How It Works Under the Hood

### 1. Test Collection Phase

When you run pytest, the `pytest_generate_tests` hook is called:

```python
def pytest_generate_tests(metafunc):
    # Load OpenAPI spec
    with open('openapi.json') as f:
        spec = json.load(f)
    
    # Extract all endpoints
    test_cases = []
    for path, methods in spec["paths"].items():
        for method in methods:
            test_cases.append((method, path, details))
    
    # Tell pytest to create one test per endpoint
    metafunc.parametrize("endpoint_config", test_cases)
```

### 2. Test Execution Phase

Pytest creates one test instance per endpoint:

```python
def test_endpoint(self, api_client, openapi_spec, endpoint_config):
    method, path, operation = endpoint_config
    
    # Generate mock data from OpenAPI schema
    request_body = generate_from_schema(operation["requestBody"])
    
    # Execute request
    response = api_client.request(method, path, json=request_body)
    
    # Validate against OpenAPI schema
    validate_response_schema(response.json(), openapi_spec)
```

## Adding New Endpoints

```yaml
# 1. Update OpenAPI spec
openapi.json:
  paths:
    /new-endpoint:
      get:
        responses:
          200:
            schema: {...}
```

```bash
# 2. Run tests - new endpoint automatically tested!
pytest tests/integration/api/test_generic_api.py -v

# Output includes:
# test_generic_api.py::TestDynamicAPI::test_endpoint[GET_/new-endpoint] PASSED
```

**No code changes needed!**

## Mock Data Generation

Mock data is automatically generated from OpenAPI schemas:

```yaml
# OpenAPI schema
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          name:
            type: string
          email:
            type: string
            format: email
```

```python
# Automatically generates:
{
    "name": "AbCdE",  # Random string
    "email": "test_1234@example.com"  # Email format
}
```

## Response Recording

Enable recording to save responses for WireMock:

```bash
ENABLE_RECORDING=true pytest tests/integration/api/test_generic_api.py::TestDynamicAPI::test_endpoint[GET_/decks] -v
```

Creates `wiremock/mappings/get_decks.json`:
```json
{
  "request": {
    "method": "GET",
    "urlPathPattern": "/decks"
  },
  "response": {
    "status": 200,
    "jsonBody": { ... }
  }
}
```

## Filtering Tests

```bash
# Run tests for specific HTTP methods
pytest tests/integration/api/test_generic_api.py -k "GET_" -v

# Run tests for specific paths
pytest tests/integration/api/test_generic_api.py -k "decks" -v

# Run single endpoint test
pytest tests/integration/api/test_generic_api.py::TestDynamicAPI::test_endpoint[POST_/decks] -v
```

## Comparison

### Code Generation Approach (Old)
```bash
# Step 1: Generate test files
python3 test_generator.py openapi.json output/

# Step 2: Run generated tests
pytest output/test_generated_deck_api.py
```

### Runtime Parameterization (New)
```bash
# Just run - no generation needed!
pytest tests/integration/api/test_generic_api.py
```

## Architecture

```
OpenAPI Spec (openapi.json)
        ↓
pytest_generate_tests() hook
        ↓
Extract all endpoints
        ↓
Create test parameters
        ↓
Pytest creates test instances
        ↓
Each test runs with endpoint config
        ↓
Mock data generated from schema
        ↓
Request executed & validated
```

## Example Test Run

```bash
$ pytest tests/integration/api/test_generic_api.py -v

collected 13 items

test_generic_api.py::TestDynamicAPI::test_endpoint[GET_/decks] PASSED           [ 7%]
test_generic_api.py::TestDynamicAPI::test_endpoint[PUT_/decks/{id}] PASSED     [15%]
test_generic_api.py::TestDynamicAPI::test_endpoint[PATCH_/decks/{id}] PASSED   [23%]
test_generic_api.py::TestDynamicAPI::test_endpoint[GET_/decks/{deckId}/cards/{id}] PASSED [30%]
test_generic_api.py::TestDynamicAPI::test_endpoint[PUT_/decks/{deckId}/cards/{id}] PASSED [38%]
test_generic_api.py::TestDynamicAPI::test_endpoint[PATCH_/decks/{deckId}/cards/{id}] PASSED [46%]
test_generic_api.py::TestDynamicAPI::test_endpoint[PUT_/decks/{deckId}/cards/difficulty] PASSED [53%]
test_generic_api.py::TestDynamicAPI::test_endpoint[POST_/otp] PASSED            [61%]
test_generic_api.py::TestDynamicAPI::test_endpoint[POST_/otp/validate] PASSED   [69%]
test_generic_api.py::TestDynamicAPI::test_endpoint[GET_/decks] PASSED           [76%]
test_generic_api.py::TestDynamicAPI::test_endpoint[POST_/decks] PASSED          [84%]
test_generic_api.py::TestDynamicAPI::test_endpoint[GET_/decks/{deckId}/cards] PASSED [92%]
test_generic_api.py::TestDynamicAPI::test_endpoint[POST_/decks/{deckId}/cards] PASSED [100%]

======================== 13 passed in 5.43s ========================
```

## Benefits Summary

1. **No Code Generation** - Tests run directly from OpenAPI spec
2. **Single Implementation** - One test works for all endpoints
3. **Automatic Discovery** - Pytest finds all endpoints automatically
4. **Dynamic Adaptation** - Add endpoints to spec, tests appear automatically
5. **Less Maintenance** - One test file instead of many generated files
6. **Response Recording** - Built-in WireMock integration

This is truly **generic** testing - like Java generics but for API testing!
