#  Copyright (c) 2025 Hal Ng
#  All Rights Reserved.
#
#  This software and associated documentation files (the "Software") are licensed
#  under the MIT License.

"""
Generic API Integration Tests
Dynamically tests all endpoints from OpenAPI specification without code generation.
Tests are parameterized based on OpenAPI spec at runtime - similar to generics in Java.
"""

import pytest
import json
from pathlib import Path
from typing import Dict, Any, List, Tuple
from tests.integration.utils.schema_validator import validate_response_schema, get_schema_for_response
from tests.integration.utils.test_generator import MockDataGenerator


def pytest_generate_tests(metafunc):
    """
    Dynamically generate tests based on OpenAPI spec.
    This hook is called during test collection and creates a test for each endpoint.
    Similar to how generics work in Java - one implementation, many instances.
    """
    if "endpoint_config" in metafunc.fixturenames:
        # Load OpenAPI spec
        spec_path = Path(__file__).parent.parent.parent.parent.parent / "api" / "src" / "main" / "resources" / "openapi.json"
        
        with open(spec_path, 'r') as f:
            openapi_spec = json.load(f)
        
        # Extract test cases from spec
        test_cases = []
        for path, methods in openapi_spec.get("paths", {}).items():
            for method, details in methods.items():
                if method.lower() in ['get', 'post', 'put', 'patch', 'delete']:
                    operation_id = details.get('operationId', f"{method}_{path}")
                    test_id = f"{method.upper()}_{path}"
                    test_cases.append((test_id, method.upper(), path, details))
        
        # Generate test parameters - pytest will create one test per endpoint
        metafunc.parametrize(
            "endpoint_config",
            test_cases,
            ids=[f"{tc[1]}_{tc[2]}" for tc in test_cases]
        )


class TestDynamicAPI:
    """
    Dynamic API test suite - like generic classes in Java.
    Single test implementation that works for ALL endpoints defined in OpenAPI spec.
    """
    
    def test_endpoint(self, api_client, openapi_spec, endpoint_config):
        """
        Generic test that validates any endpoint from OpenAPI spec.
        
        This is the "generic" implementation - pytest creates one instance per endpoint.
        Similar to: class GenericTest<T> { void test(T endpoint) { ... } }
        """
        test_id, method, path, operation = endpoint_config
        
        # Generate mock data from OpenAPI schema
        mock_generator = MockDataGenerator()
        request_body = None
        
        if "requestBody" in operation:
            content = operation["requestBody"].get("content", {})
            if "application/json" in content:
                schema = content["application/json"].get("schema")
                if schema:
                    request_body = mock_generator.generate_from_schema(schema, openapi_spec)
        
        # Generate path parameters from schema
        path_params = {}
        for param in operation.get("parameters", []):
            if param.get("in") == "path":
                param_schema = param.get("schema", {})
                value = mock_generator.generate_from_schema(param_schema, openapi_spec)
                path_params[param["name"]] = str(value)
        
        # Build URL with path parameters
        url = path
        for param_name, param_value in path_params.items():
            url = url.replace(f"{{{param_name}}}", param_value)
        
        # Execute request using appropriate HTTP method
        method_func = getattr(api_client, method.lower())
        if request_body:
            response = method_func(url, json=request_body)
        else:
            response = method_func(url)
        
        # Validate response status
        expected_status = [200, 201, 204]
        assert response.status_code in expected_status, \
            f"{method} {path}: Expected {expected_status}, got {response.status_code}: {response.text}"
        
        # Validate response schema against OpenAPI spec
        if response.status_code == 200 and response.text:
            schema = get_schema_for_response(openapi_spec, path, method.lower(), response.status_code)
            if schema:
                is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
                assert is_valid, f"{method} {path}: Schema validation failed: {error}"
