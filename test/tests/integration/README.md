# Integration Testing Framework

This directory contains the integration testing framework for the Oopsly backend API.

## Overview

The framework provides a declarative YAML-based approach to define and execute integration tests against the backend API. It supports:

- **Flow-based testing**: Organize tests into logical flows with setup, execution, and teardown phases
- **Variable capture and reuse**: Capture values from API responses (e.g., access tokens, IDs) and use them in subsequent requests
- **Comprehensive assertions**: Validate response status codes, JSON paths, and data types
- **Edge case testing**: Test invalid inputs, missing authentication, and error scenarios

## Installation

Install the required dependencies:

```bash
cd test/tests/integration
pip install -r requirements.txt
```

## Directory Structure

```
integration/
├── __init__.py           # Package initialization
├── main.py               # Main entry point for running tests
├── runner.py             # Core test runner implementation
├── requirements.txt      # Python dependencies
├── flows/                # Test flow definitions
│   ├── deck.yaml
│   ├── collection.yaml
│   ├── card.yaml
│   ├── testsuite.yaml
│   ├── question.yaml
│   ├── user.yaml
│   └── userprofile.yaml
└── README.md            # This file
```

## Running Tests

From the `test` directory:

```bash
python3 -m tests.integration.main
```

The test runner will:
1. Load the API configuration from `test/tests/config/api.yaml`
2. Start the Docker environment (if enabled in main.py)
3. Execute all test flows in the `flows/` directory
4. Report test results

## Writing Test Flows

Test flows are defined in YAML files in the `flows/` directory. Each flow can have multiple test scenarios.

### Basic Structure

```yaml
flows:
  - flow: Flow Name
    description: "Description of what this flow tests"
    before-all:
      - name: Setup Step
        api: API_NAME
        with:
          PARAM1: value1
        assertions:
          - path: $.status
            type: equals
            value: 200
        env-vars:
          VAR_NAME: $.data.field
    steps:
      - name: Test Step
        api: API_NAME
        with:
          PARAM1: ${VAR_NAME}
        assertions:
          - path: $.data.id
            type: not-null
```

### Variable Substitution

- Use `$VAR_NAME` or `${VAR_NAME}` in API definitions
- Variables are resolved from the test context (captured from previous responses)

### Assertions

Supported assertion types:

- `equals`: Exact match (e.g., `path: $.status, type: equals, value: 200`)
- `contains`: String containment (e.g., `path: $.message, type: contains, value: "success"`)
- `not-null`: Value is not null (e.g., `path: $.data.id, type: not-null`)
- `status-code`: HTTP status code (e.g., `type: status-code, value: 201`)

### Variable Capture

Use `env-vars` to capture values from responses:

```yaml
env-vars:
  AUTH_TOKEN: $.data.access_token
  USER_ID: $.data.user.id
```

These variables become available for subsequent steps using `${AUTH_TOKEN}` or `${USER_ID}`.

## API Configuration

API endpoints are defined in `test/tests/config/api.yaml`:

```yaml
configs:
  environments:
    base_url: "http://localhost:9009/api/v1/oopsly"
  apis:
    - name: API_NAME
      method: POST
      endpoint: /path/$PARAM
      headers:
        Authorization: "Bearer $AUTH_TOKEN"
      body:
        field:
          value: $VALUE
          constraints:
            nullable: false
```

## Examples

See the existing flow files for comprehensive examples:

- `deck.yaml`: Basic CRUD operations
- `collection.yaml`: Nested resource management
- `card.yaml`: Bulk operations
- `testsuite.yaml`: Delete operations
- `question.yaml`: Multiple data types
- `user.yaml`: Authentication flows
- `userprofile.yaml`: Profile management

## Features

### JSONPath Support

The framework uses JSONPath syntax for extracting data from responses:

- `$.data.access_token` - Access nested fields
- `$.data.items[0].id` - Access array elements
- `$.status` - Access top-level fields

### Edge Case Testing

Each flow file should include edge case scenarios:

- Invalid IDs
- Missing authentication
- Invalid parameters
- Non-existent resources

### Flow Organization

Flows support:

- `before-all`: Setup steps that run before the main test steps
- `steps`: Main test execution steps
- Multiple flows per file for logical grouping

## Troubleshooting

### Module not found errors

Make sure you're running from the `test` directory and using the module syntax:

```bash
cd test
python3 -m tests.integration.main
```

### Connection refused errors

Ensure the backend API server is running on the configured base_url (default: `http://localhost:9009/api/v1/oopsly`).

### Variable substitution issues

- Check that variables are captured in `env-vars` before being used
- Verify JSONPath expressions are correct
- Ensure variables are referenced with `$` or `${}` syntax
