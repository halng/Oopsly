#     Copyright 2026 Hao Nguyen Tan
#
#     Licensed under the Apache License, Version 2.0 (the "License");
#     you may not use this file except in compliance with the License.
#     You may obtain a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#     Unless required by applicable law or agreed to in writing, software
#     distributed under the License is distributed on an "AS IS" BASIS,
#     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#     See the License for the specific language governing permissions and
#     limitations under the License.


import json
import logging
import re
import os
import requests
import yaml
from typing import Dict, Any, Optional, List, Tuple
from deepdiff import DeepDiff
from pathlib import Path
import jsonpath_ng
from jsonpath_ng import parse


# --- CONFIGURATION ---
logger = logging.getLogger(__name__)

# Global Context to store variables shared between steps
# (e.g. {"user_id": 123, "token": "abc"})
CONTEXT: Dict[str, Any] = {}
BASE_URL: str = ""


def load_test_definition(file_path: str = "tests/config.yaml") -> Dict[str, Any]:
    """
    Load API configuration (Test Cases) from a YAML file.
    """
    if not os.path.exists(file_path):
        logger.error(f"❌ Config file not found: {file_path}")
        return []

    try:
        with open(file_path, "r") as f:
            config = yaml.safe_load(f)
            # Support both list of cases or dictionary with 'cases' key
            return config.get("cases", config) if isinstance(config, dict) else config
    except yaml.YAMLError as e:
        logger.error(f"❌ Error parsing YAML: {e}")
        return []


def _substitute_variables(text: str) -> str:
    """
    Helper: Replace placeholders like ${user_id} or $user_id with values from CONTEXT.
    """
    if not isinstance(text, str):
        return text

    # First, handle ${variable_name} format (e.g., ${AUTH_TOKEN})
    pattern = re.compile(r"\$\{(\w+)\}")

    def replacer(match):
        key = match.group(1)
        # Return value from CONTEXT if exists, else keep original placeholder
        # converting to str because re.sub expects string return
        return str(CONTEXT.get(key, f"${{{key}}}"))

    text = pattern.sub(replacer, text)

    # Then handle $variable_name format (e.g., $EMAIL)
    # Pattern uses negative lookahead (?!\{) to avoid matching ${...} which was already handled
    simple_var_pattern = re.compile(r"\$(?!\{)(\w+)")

    def replacer2(match):
        key = match.group(1)
        return str(CONTEXT.get(key, f"${key}"))

    return simple_var_pattern.sub(replacer2, text)


def _process_data_with_context(data: Any) -> Any:
    """
    Recursively walk through dicts/lists and substitute variables.
    """
    if isinstance(data, dict):
        return {k: _process_data_with_context(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_process_data_with_context(item) for item in data]
    elif isinstance(data, str):
        return _substitute_variables(data)
    else:
        return data


def build_api_request(api_info: dict, step_vars: dict = None) -> dict:
    """
    Prepare the request dictionary, substituting variables from Context and step_vars.
    """
    if step_vars is None:
        step_vars = {}

    # Temporarily add step vars to context for substitution
    original_context = CONTEXT.copy()
    try:
        # First, substitute any variables in step_vars values using current CONTEXT
        # This handles cases like: with: { AUTH_TOKEN: ${AUTH_TOKEN} }
        resolved_step_vars = {}
        for key, value in step_vars.items():
            if isinstance(value, str):
                resolved_step_vars[key] = _substitute_variables(value)
            else:
                resolved_step_vars[key] = value

        # Now update CONTEXT with the resolved values
        CONTEXT.update(resolved_step_vars)

        # 1. Build URL: base_url + endpoint with variable substitution
        endpoint = _substitute_variables(api_info.get("endpoint", ""))
        url = BASE_URL + endpoint

        # 2. Substitute variables in Headers
        headers = {}
        for key, value in api_info.get("headers", {}).items():
            headers[key] = _substitute_variables(value)

        # 3. Build Body with variable substitution
        body = None
        if "body" in api_info:
            body = {}
            for key, field_def in api_info["body"].items():
                if isinstance(field_def, dict) and "value" in field_def:
                    body[key] = _substitute_variables(field_def["value"])
                else:
                    body[key] = _substitute_variables(field_def)

        # 4. Build Query Params with variable substitution
        params = {}
        if "query-params" in api_info:
            for key, param_def in api_info["query-params"].items():
                if isinstance(param_def, dict) and "value" in param_def:
                    params[key] = _substitute_variables(param_def["value"])
                else:
                    params[key] = _substitute_variables(param_def)

        result = {
            "method": api_info.get("method", "GET").upper(),
            "url": url,
            "headers": headers,
            "params": params,
        }

        if body:
            result["json"] = body

        return result
    finally:
        # Always restore original context
        CONTEXT.clear()
        CONTEXT.update(original_context)


def send_api_request(request_data: dict) -> Optional[requests.Response]:
    """
    Send the API request using the requests library.
    """
    try:
        method = request_data.pop("method")
        url = request_data.pop("url")

        logger.info(f"      📡 Sending {method} {url}")

        # requests.request handles json, headers, params kwargs automatically
        response = requests.request(method, url, **request_data)
        return response
    except requests.RequestException as e:
        logger.error(f"❌ Network Error: {e}")
        return None


def load_expected_response(file_path: str) -> Optional[Dict]:
    """
    Load expected API response from a JSON file.
    """
    if not file_path:
        return None

    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"❌ Error loading expected response file '{file_path}': {e}")
        return None


def _mask_dynamic_fields(actual: Any, expected: Any):
    """
    Recursively update 'actual' to match 'expected' IF expected has magic markers.
    Markers supported: "__IGNORE__", "__DATETIME__"
    """
    if isinstance(expected, dict) and isinstance(actual, dict):
        for k, v in expected.items():
            if k in actual:
                if v == "__IGNORE__":
                    actual[k] = "__IGNORE__"
                elif v == "__DATETIME__":
                    # If actual is present, we blindly match it to satisfy equality
                    actual[k] = "__DATETIME__"
                else:
                    _mask_dynamic_fields(actual[k], v)
    elif isinstance(expected, list) and isinstance(actual, list):
        if len(expected) == len(actual):
            for i in range(len(expected)):
                _mask_dynamic_fields(actual[i], expected[i])


def get_value_from_jsonpath(data: Any, path: str) -> Any:
    """
    Extract value from data using JSONPath expression.
    """
    try:
        jsonpath_expr = parse(path)
        matches = jsonpath_expr.find(data)
        if matches:
            return matches[0].value
        return None
    except Exception as e:
        logger.error(f"❌ Error parsing JSONPath '{path}': {e}")
        return None


def validate_api_response(
    response: requests.Response, step_config: dict, is_recording_response: bool = False
) -> bool:
    """
    Validate status code, assertions, and capture variables.
    Returns True if passed, False otherwise.
    """
    if response is None:
        return False

    # 1. Extract Response JSON
    try:
        actual_json = response.json() if response.content else None
    except json.JSONDecodeError:
        logger.error("      ❌ Invalid JSON response")
        return False

    # 2. Validate Assertions
    assertions = step_config.get("assertions", [])
    for assertion in assertions:
        assertion_type = assertion.get("type")
        expected_value = assertion.get("value")
        json_path = assertion.get("path")

        if assertion_type == "equals":
            if json_path:
                actual_value = get_value_from_jsonpath(actual_json, json_path)
                if actual_value != expected_value:
                    logger.error(
                        f"      ❌ Assertion failed: {json_path} = {actual_value}, expected {expected_value}"
                    )
                    return False
            else:
                logger.error(f"      ❌ Assertion 'equals' requires 'path' field")
                return False

        elif assertion_type == "contains":
            if json_path:
                actual_value = get_value_from_jsonpath(actual_json, json_path)
                if expected_value not in str(actual_value):
                    logger.error(
                        f"      ❌ Assertion failed: {json_path} does not contain '{expected_value}'"
                    )
                    return False
            else:
                # Check if value is in the entire response
                if expected_value not in response.text:
                    logger.error(
                        f"      ❌ Assertion failed: Response does not contain '{expected_value}'"
                    )
                    return False

        elif assertion_type == "not-null":
            if json_path:
                actual_value = get_value_from_jsonpath(actual_json, json_path)
                if actual_value is None:
                    logger.error(f"      ❌ Assertion failed: {json_path} is null")
                    return False

        elif assertion_type == "status-code":
            if response.status_code != expected_value:
                logger.error(
                    f"      ❌ Status code mismatch: got {response.status_code}, expected {expected_value}"
                )
                return False

    # 3. Capture Variables (Store data for future steps)
    # Support both 'capture' (old format) and 'env-vars' (new format with JSONPath)
    env_vars = step_config.get("env-vars", {})
    for context_key, json_path in env_vars.items():
        if json_path.startswith("$."):
            # JSONPath format
            val = get_value_from_jsonpath(actual_json, json_path)
        else:
            # Simple key access
            val = actual_json.get(json_path) if actual_json else None

        if val is not None:
            CONTEXT[context_key] = val

    # Old capture format support
    captures = step_config.get("capture", {})
    for context_key, json_key in captures.items():
        val = actual_json.get(json_key) if actual_json else None
        if val:
            CONTEXT[context_key] = val

    return True


def list_all_flow(directory_path):
    p = Path(directory_path)
    # Use list comprehension to filter only files
    files = [entry for entry in p.iterdir() if entry.is_file()]
    return files


def _run(env: dict, apis: dict, case: dict) -> Tuple[bool, dict]:
    step_name = case.get('name', 'Unnamed Step')
    logger.info(f"   🔹 {step_name}")
    
    if not case:
        logger.error(f"      ❌ Step configuration is empty")
        return False, env

    api_name = case.get("api")
    if not api_name:
        logger.error(f"      ❌ API name not specified")
        return False, env

    api_info = apis.get(api_name)
    if not api_info:
        logger.error(f"      ❌ API '{api_name}' not found")
        return False, env

    # Get step-specific variables from 'with' key
    step_vars = case.get("with", {})

    req_data = build_api_request(api_info, step_vars)
    
    # Log request details (compact format)
    method = req_data.get('method', 'GET')
    url = req_data.get('url', '')
    logger.info(f"      ▶ {method} {url}")
    
    # Log request body if present (truncated)
    if 'json' in req_data and req_data['json']:
        body_str = str(req_data['json'])
        if len(body_str) > 100:
            body_str = body_str[:100] + '...'
        logger.info(f"        Body: {body_str}")
    
    response = send_api_request(req_data)

    if response is not None:
        # Log response status (compact format)
        status_icon = "✓" if 200 <= response.status_code < 300 else "✗"
        logger.info(f"      ◀ {status_icon} Status {response.status_code}")
        
        # Log response body (truncated)
        response_text = response.text
        if len(response_text) > 200:
            response_text = response_text[:200] + '...'
        logger.debug(f"        Response: {response_text}")
    else:
        logger.error(f"      ◀ ✗ No response received")
        return False, env

    isPassed = validate_api_response(response, case, is_recording_response=False)

    if isPassed:
        # Update env with any captured variables from CONTEXT
        captured_vars = []
        for key, value in case.get("env-vars", {}).items():
            if key in CONTEXT:
                env[key] = CONTEXT[key]
                captured_vars.append(key)
        
        if captured_vars:
            logger.info(f"      💾 Captured: {', '.join(captured_vars)}")

    return isPassed, env


def run(env: dict, apis: dict) -> bool:
    """
    Main execution loop.
    """
    global BASE_URL

    # Set BASE_URL from environment
    BASE_URL = env.get("base_url", "")
    if not BASE_URL:
        logger.error("❌ base_url not found in environment configuration")
        return False

    logger.info(f"🔗 Base URL: {BASE_URL}")

    # Get flows directory path relative to this file
    flows_dir = os.path.join(os.path.dirname(__file__), "flows")
    test_flows = list_all_flow(flows_dir)
    logger.info(f"🚀 Starting Test Runner: {len(test_flows)} flow files found\n")
    
    # Statistics tracking
    total_flows = 0
    passed_flows = 0
    failed_flows = 0
    total_steps = 0
    passed_steps = 0
    failed_steps = 0
    failed_step_details = []
    
    all_passed = True

    for flow_file in test_flows:
        logger.info(f"{'='*80}")
        logger.info(f"📁 Flow File: {flow_file.name}")
        logger.info(f"{'='*80}")
        
        config_path = str(flow_file)
        test_definition = load_test_definition(config_path)
        if not test_definition:
            logger.error("🚫 No test cases found.\n")
            continue

        flows = test_definition.get("flows", [])
        
        for integrate_flow in flows:
            total_flows += 1
            flow_name = integrate_flow.get("flow", "Unnamed Flow")
            flow_description = integrate_flow.get("description", "")
            
            logger.info(f"🔸 Flow: {flow_name}")
            if flow_description:
                logger.info(f"   {flow_description}")
            
            flow_passed = True

            before_all_hook = integrate_flow.get("before-all")
            if before_all_hook:
                logger.info(f"   📋 Setup ({len(before_all_hook)} steps)")
                for hook_case in before_all_hook:
                    total_steps += 1
                    passed, env = _run(env, apis, hook_case)
                    
                    status = "✅ Passed" if passed else "❌ Failed"
                    logger.info(f"      → {status}\n")
                    
                    if passed:
                        passed_steps += 1
                    else:
                        failed_steps += 1
                        all_passed = False
                        flow_passed = False
                        failed_step_details.append({
                            'flow_file': flow_file.name,
                            'flow_name': flow_name,
                            'step_name': hook_case.get('name'),
                            'step_type': 'setup'
                        })

            main_steps = integrate_flow.get("steps", [])
            if main_steps:
                logger.info(f"   📋 Test Steps ({len(main_steps)} steps)")
                for step_case in main_steps:
                    total_steps += 1
                    passed, env = _run(env, apis, step_case)
                    
                    status = "✅ Passed" if passed else "❌ Failed"
                    logger.info(f"      → {status}\n")
                    
                    if passed:
                        passed_steps += 1
                    else:
                        failed_steps += 1
                        all_passed = False
                        flow_passed = False
                        failed_step_details.append({
                            'flow_file': flow_file.name,
                            'flow_name': flow_name,
                            'step_name': step_case.get('name'),
                            'step_type': 'test'
                        })
            
            if flow_passed:
                passed_flows += 1
                logger.info(f"   ✅ Flow Passed: {flow_name}\n")
            else:
                failed_flows += 1
                logger.info(f"   ❌ Flow Failed: {flow_name}\n")

    # Print summary statistics
    logger.info("\n" + "="*80)
    logger.info("📊 TEST EXECUTION SUMMARY")
    logger.info("="*80)
    logger.info(f"\n📦 Flow Suites: {total_flows} total")
    logger.info(f"   ✅ Passed: {passed_flows}")
    logger.info(f"   ❌ Failed: {failed_flows}")
    
    logger.info(f"\n🔧 Test Steps: {total_steps} total")
    logger.info(f"   ✅ Passed: {passed_steps}")
    logger.info(f"   ❌ Failed: {failed_steps}")
    
    if failed_step_details:
        logger.info(f"\n{'='*80}")
        logger.info(f"❌ FAILED STEPS ({len(failed_step_details)} failures)")
        logger.info("="*80)
        for idx, failure in enumerate(failed_step_details, 1):
            logger.info(f"\n{idx}. 📁 {failure['flow_file']} → {failure['flow_name']}")
            logger.info(f"   🔹 Step: {failure['step_name']}")
            logger.info(f"   📍 Type: {failure['step_type']}")
    
    logger.info("\n" + "="*80)
    
    if all_passed:
        logger.info("🎉 ALL TESTS PASSED!")
        logger.info("="*80 + "\n")
        return True
    else:
        logger.error(f"💥 TEST FAILURES: {failed_steps}/{total_steps} steps failed in {failed_flows}/{total_flows} flow(s)")
        logger.info("="*80 + "\n")
        return False
