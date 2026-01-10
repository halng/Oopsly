#  Copyright (c) 2025 Hal Ng
#  All Rights Reserved.
#
#  This software and associated documentation files (the "Software") are licensed
#  under the MIT License.

"""
Generic Test Generator
Automatically generates integration tests from OpenAPI specification.
"""

import json
import random
import string
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime


class MockDataGenerator:
    """Generates mock data based on OpenAPI schema definitions."""
    
    @staticmethod
    def generate_from_schema(schema: Dict[str, Any], spec: Dict[str, Any]) -> Any:
        """Generate mock data from OpenAPI schema."""
        # Handle $ref
        if "$ref" in schema:
            ref_path = schema["$ref"].replace("#/", "").split("/")
            referenced = spec
            for part in ref_path:
                referenced = referenced[part]
            return MockDataGenerator.generate_from_schema(referenced, spec)
        
        schema_type = schema.get("type", "string")
        schema_format = schema.get("format")
        
        if schema_type == "object":
            return MockDataGenerator._generate_object(schema, spec)
        elif schema_type == "array":
            return MockDataGenerator._generate_array(schema, spec)
        elif schema_type == "string":
            return MockDataGenerator._generate_string(schema_format, schema)
        elif schema_type == "integer":
            return MockDataGenerator._generate_integer(schema)
        elif schema_type == "number":
            return MockDataGenerator._generate_number(schema)
        elif schema_type == "boolean":
            return random.choice([True, False])
        else:
            return None
    
    @staticmethod
    def _generate_object(schema: Dict[str, Any], spec: Dict[str, Any]) -> Dict[str, Any]:
        """Generate object from schema."""
        result = {}
        properties = schema.get("properties", {})
        required = schema.get("required", [])
        
        for prop_name, prop_schema in properties.items():
            if prop_name in required or random.choice([True, False]):
                result[prop_name] = MockDataGenerator.generate_from_schema(prop_schema, spec)
        
        return result
    
    @staticmethod
    def _generate_array(schema: Dict[str, Any], spec: Dict[str, Any]) -> List[Any]:
        """Generate array from schema."""
        items_schema = schema.get("items", {})
        min_items = schema.get("minItems", 1)
        max_items = schema.get("maxItems", 3)
        count = random.randint(min_items, max_items)
        
        return [MockDataGenerator.generate_from_schema(items_schema, spec) for _ in range(count)]
    
    @staticmethod
    def _generate_string(format_type: Optional[str], schema: Dict[str, Any]) -> str:
        """Generate string based on format."""
        if format_type == "uuid":
            return str(uuid.uuid4())
        elif format_type == "email":
            return f"test_{random.randint(1000, 9999)}@example.com"
        elif format_type == "date-time":
            return datetime.now().isoformat()
        elif format_type == "date":
            return datetime.now().date().isoformat()
        else:
            # Use example if provided
            if "example" in schema:
                return schema["example"]
            # Generate random string
            length = schema.get("minLength", 5)
            if "maxLength" in schema:
                length = min(length, schema["maxLength"])
            return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    
    @staticmethod
    def _generate_integer(schema: Dict[str, Any]) -> int:
        """Generate integer within constraints."""
        minimum = schema.get("minimum", 0)
        maximum = schema.get("maximum", 100)
        return random.randint(minimum, maximum)
    
    @staticmethod
    def _generate_number(schema: Dict[str, Any]) -> float:
        """Generate number within constraints."""
        minimum = schema.get("minimum", 0.0)
        maximum = schema.get("maximum", 100.0)
        return random.uniform(minimum, maximum)


class GenericTestGenerator:
    """Generates pytest test cases from OpenAPI specification."""
    
    def __init__(self, spec_path: Path):
        """Initialize with OpenAPI spec path."""
        self.spec_path = spec_path
        with open(spec_path, 'r') as f:
            self.spec = json.load(f)
        self.mock_generator = MockDataGenerator()
    
    def generate_request_body(self, operation: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generate request body from operation definition."""
        if "requestBody" not in operation:
            return None
        
        request_body = operation["requestBody"]
        content = request_body.get("content", {})
        
        # Try application/json first
        if "application/json" in content:
            schema = content["application/json"].get("schema")
            if schema:
                return self.mock_generator.generate_from_schema(schema, self.spec)
        
        return None
    
    def generate_path_parameters(self, parameters: List[Dict[str, Any]]) -> Dict[str, str]:
        """Generate path parameters."""
        path_params = {}
        for param in parameters:
            if param.get("in") == "path":
                param_name = param["name"]
                param_schema = param.get("schema", {})
                value = self.mock_generator.generate_from_schema(param_schema, self.spec)
                path_params[param_name] = str(value)
        return path_params
    
    def extract_operations(self) -> List[Dict[str, Any]]:
        """Extract all operations from OpenAPI spec."""
        operations = []
        
        for path, methods in self.spec.get("paths", {}).items():
            for method, details in methods.items():
                if method.lower() in ['get', 'post', 'put', 'patch', 'delete']:
                    operations.append({
                        'path': path,
                        'method': method.upper(),
                        'operationId': details.get('operationId', f"{method}_{path}"),
                        'details': details,
                        'tags': details.get('tags', []),
                        'summary': details.get('summary', ''),
                        'parameters': details.get('parameters', []),
                        'requestBody': details.get('requestBody'),
                        'responses': details.get('responses', {})
                    })
        
        return operations
    
    def generate_test_function(self, operation: Dict[str, Any]) -> str:
        """Generate a test function for an operation."""
        method = operation['method']
        path = operation['path']
        op_id = operation['operationId']
        
        # Generate test function name
        test_name = f"test_{op_id}_success"
        
        # Generate test body
        test_code = f'''    def {test_name}(self, api_client, openapi_spec):
        """Auto-generated test for {method} {path}."""
        # Generate path parameters
        path_params = {self.generate_path_parameters(operation['parameters'])}
        
        # Build URL with path parameters
        url = "{path}"
        for param_name, param_value in path_params.items():
            url = url.replace("{{" + param_name + "}}", param_value)
        
        # Generate request body if needed
        request_body = {self._generate_request_body_code(operation)}
        
        # Make request
        if request_body:
            response = api_client.{method.lower()}(url, json=request_body)
        else:
            response = api_client.{method.lower()}(url)
        
        # Assertions
        assert response.status_code in [200, 201, 204], \\
            f"Expected success status, got {{response.status_code}}: {{response.text}}"
        
        # Schema validation
        if response.status_code == 200 and response.text:
            from tests.integration.utils.schema_validator import get_schema_for_response, validate_response_schema
            schema = get_schema_for_response(openapi_spec, "{path}", "{method.lower()}", response.status_code)
            if schema:
                is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
                assert is_valid, f"Schema validation failed: {{error}}"
'''
        
        return test_code
    
    def _generate_request_body_code(self, operation: Dict[str, Any]) -> str:
        """Generate code for request body."""
        body = self.generate_request_body(operation['details'])
        if body:
            return json.dumps(body, indent=12)
        return "None"
    
    def generate_test_file(self, operations: List[Dict[str, Any]], tag: str = None) -> str:
        """Generate complete test file."""
        # Filter operations by tag if specified
        if tag:
            operations = [op for op in operations if tag in op['tags']]
        
        if not operations:
            return ""
        
        test_file = '''#  Copyright (c) 2025 Hal Ng
#  All Rights Reserved.
#
#  This software and associated documentation files (the "Software") are licensed
#  under the MIT License.

"""
Auto-generated API Integration Tests
Generated from OpenAPI specification.
"""

import pytest
import json
from tests.integration.utils.schema_validator import validate_response_schema, get_schema_for_response


class TestGeneratedAPI:
    """Auto-generated test suite."""
    
'''
        
        for operation in operations:
            test_file += self.generate_test_function(operation) + "\n"
        
        return test_file


def generate_all_tests(spec_path: str, output_dir: str):
    """Generate all test files from OpenAPI spec."""
    generator = GenericTestGenerator(Path(spec_path))
    operations = generator.extract_operations()
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Group by tags
    tags = set()
    for op in operations:
        tags.update(op['tags'])
    
    # Generate test file per tag
    for tag in tags:
        test_content = generator.generate_test_file(operations, tag)
        if test_content:
            filename = f"test_generated_{tag.lower()}_api.py"
            output_file = output_path / filename
            with open(output_file, 'w') as f:
                f.write(test_content)
            print(f"Generated: {output_file}")
    
    # Generate a combined test file
    test_content = generator.generate_test_file(operations)
    if test_content:
        output_file = output_path / "test_generated_all_api.py"
        with open(output_file, 'w') as f:
            f.write(test_content)
        print(f"Generated: {output_file}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python test_generator.py <openapi_spec_path> <output_dir>")
        sys.exit(1)
    
    spec_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    generate_all_tests(spec_path, output_dir)
