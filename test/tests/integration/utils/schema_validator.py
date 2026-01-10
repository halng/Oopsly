#  Copyright (c) 2025 Hal Ng
#  All Rights Reserved.
#
#  This software and associated documentation files (the "Software") are licensed
#  under the MIT License. You may use, copy, modify, merge, publish, distribute,
#  sublicense, and/or sell copies of the Software, subject to the following conditions:
#
#  1. The above copyright notice and this permission notice shall be included
#     in all copies or substantial portions of the Software.
#  2. The Software is provided "as is," without warranty of any kind, express or
#     implied, including but not limited to the warranties of merchantability,
#     fitness for a particular purpose, and noninfringement.
#  3. The authors or copyright holders shall not be liable for any claim, damages,
#     or other liability, whether in an action of contract, tort, or otherwise,
#     arising from, out of, or in connection with the Software.

"""
Schema validation utilities for OpenAPI specification-driven testing.
This module provides functions to validate API responses against their OpenAPI schemas.
"""

from typing import Dict, Any, Optional
import re


def validate_response_schema(response_data: Any, schema: Dict[str, Any], spec: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate response data against an OpenAPI schema definition.
    
    Args:
        response_data: The actual response data to validate
        schema: The OpenAPI schema to validate against
        spec: The full OpenAPI specification (for resolving $ref)
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        _validate_value(response_data, schema, spec)
        return True, None
    except ValidationError as e:
        return False, str(e)


class ValidationError(Exception):
    """Custom exception for schema validation errors."""
    pass


def _resolve_ref(ref: str, spec: Dict[str, Any]) -> Dict[str, Any]:
    """
    Resolve a $ref reference in the OpenAPI specification.
    
    Args:
        ref: The reference string (e.g., "#/components/schemas/Res")
        spec: The full OpenAPI specification
    
    Returns:
        The resolved schema object
    """
    if not ref.startswith("#/"):
        raise ValidationError(f"Unsupported $ref format: {ref}")
    
    parts = ref[2:].split("/")
    current = spec
    
    for part in parts:
        if part not in current:
            raise ValidationError(f"Reference not found: {ref}")
        current = current[part]
    
    return current


def _validate_value(value: Any, schema: Dict[str, Any], spec: Dict[str, Any], path: str = "root"):
    """
    Recursively validate a value against a schema.
    
    Args:
        value: The value to validate
        schema: The schema to validate against
        spec: The full OpenAPI specification
        path: The current path in the data structure (for error reporting)
    """
    # Handle $ref
    if "$ref" in schema:
        referenced_schema = _resolve_ref(schema["$ref"], spec)
        return _validate_value(value, referenced_schema, spec, path)
    
    # Get the expected type
    schema_type = schema.get("type")
    
    # Handle nullable values
    if value is None:
        if schema.get("nullable", False):
            return
        raise ValidationError(f"{path}: Value is null but schema does not allow null")
    
    # Validate based on type
    if schema_type == "object":
        _validate_object(value, schema, spec, path)
    elif schema_type == "array":
        _validate_array(value, schema, spec, path)
    elif schema_type == "string":
        _validate_string(value, schema, path)
    elif schema_type == "integer":
        _validate_integer(value, schema, path)
    elif schema_type == "number":
        _validate_number(value, schema, path)
    elif schema_type == "boolean":
        _validate_boolean(value, schema, path)


def _validate_object(value: Any, schema: Dict[str, Any], spec: Dict[str, Any], path: str):
    """Validate an object value."""
    if not isinstance(value, dict):
        raise ValidationError(f"{path}: Expected object, got {type(value).__name__}")
    
    properties = schema.get("properties", {})
    required = schema.get("required", [])
    
    # Check required properties
    for req_prop in required:
        if req_prop not in value:
            raise ValidationError(f"{path}: Missing required property '{req_prop}'")
    
    # Validate each property
    for prop_name, prop_value in value.items():
        if prop_name in properties:
            _validate_value(prop_value, properties[prop_name], spec, f"{path}.{prop_name}")


def _validate_array(value: Any, schema: Dict[str, Any], spec: Dict[str, Any], path: str):
    """Validate an array value."""
    if not isinstance(value, list):
        raise ValidationError(f"{path}: Expected array, got {type(value).__name__}")
    
    items_schema = schema.get("items")
    if items_schema:
        for i, item in enumerate(value):
            _validate_value(item, items_schema, spec, f"{path}[{i}]")
    
    # Check array constraints
    min_items = schema.get("minItems")
    max_items = schema.get("maxItems")
    
    if min_items is not None and len(value) < min_items:
        raise ValidationError(f"{path}: Array has {len(value)} items, minimum is {min_items}")
    
    if max_items is not None and len(value) > max_items:
        raise ValidationError(f"{path}: Array has {len(value)} items, maximum is {max_items}")


def _validate_string(value: Any, schema: Dict[str, Any], path: str):
    """Validate a string value."""
    if not isinstance(value, str):
        raise ValidationError(f"{path}: Expected string, got {type(value).__name__}")
    
    # Check format constraints
    format_type = schema.get("format")
    if format_type == "uuid":
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        if not re.match(uuid_pattern, value, re.IGNORECASE):
            raise ValidationError(f"{path}: Invalid UUID format: {value}")
    elif format_type == "email":
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, value):
            raise ValidationError(f"{path}: Invalid email format: {value}")
    
    # Check length constraints
    min_length = schema.get("minLength")
    max_length = schema.get("maxLength")
    
    if min_length is not None and len(value) < min_length:
        raise ValidationError(f"{path}: String length {len(value)} is less than minimum {min_length}")
    
    if max_length is not None and len(value) > max_length:
        raise ValidationError(f"{path}: String length {len(value)} exceeds maximum {max_length}")
    
    # Check pattern
    pattern = schema.get("pattern")
    if pattern and not re.match(pattern, value):
        raise ValidationError(f"{path}: String does not match pattern {pattern}")


def _validate_integer(value: Any, schema: Dict[str, Any], path: str):
    """Validate an integer value."""
    if not isinstance(value, int) or isinstance(value, bool):
        raise ValidationError(f"{path}: Expected integer, got {type(value).__name__}")
    
    # Check range constraints
    minimum = schema.get("minimum")
    maximum = schema.get("maximum")
    
    if minimum is not None and value < minimum:
        raise ValidationError(f"{path}: Value {value} is less than minimum {minimum}")
    
    if maximum is not None and value > maximum:
        raise ValidationError(f"{path}: Value {value} exceeds maximum {maximum}")


def _validate_number(value: Any, schema: Dict[str, Any], path: str):
    """Validate a number value."""
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValidationError(f"{path}: Expected number, got {type(value).__name__}")
    
    # Check range constraints
    minimum = schema.get("minimum")
    maximum = schema.get("maximum")
    
    if minimum is not None and value < minimum:
        raise ValidationError(f"{path}: Value {value} is less than minimum {minimum}")
    
    if maximum is not None and value > maximum:
        raise ValidationError(f"{path}: Value {value} exceeds maximum {maximum}")


def _validate_boolean(value: Any, schema: Dict[str, Any], path: str):
    """Validate a boolean value."""
    if not isinstance(value, bool):
        raise ValidationError(f"{path}: Expected boolean, got {type(value).__name__}")


def get_schema_for_response(openapi_spec: Dict[str, Any], path: str, method: str, status_code: int) -> Optional[Dict[str, Any]]:
    """
    Extract the response schema for a specific endpoint and status code from the OpenAPI spec.
    
    Args:
        openapi_spec: The full OpenAPI specification
        path: The API path (e.g., "/decks/{id}")
        method: The HTTP method (e.g., "get")
        status_code: The HTTP status code (e.g., 200)
    
    Returns:
        The schema dictionary or None if not found
    """
    paths = openapi_spec.get("paths", {})
    
    if path not in paths:
        return None
    
    path_item = paths[path]
    if method.lower() not in path_item:
        return None
    
    operation = path_item[method.lower()]
    responses = operation.get("responses", {})
    
    response = responses.get(str(status_code))
    if not response:
        return None
    
    content = response.get("content", {})
    # Try application/json first, then */*
    media_type = content.get("application/json") or content.get("*/*")
    
    if not media_type:
        return None
    
    return media_type.get("schema")
