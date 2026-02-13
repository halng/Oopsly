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

import logging
import re
import os
import json

import requests
import yaml
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
from jsonpath_ng import parse
from ulid import ULID

# --- CONFIGURATION ---
logger = logging.getLogger(__name__)

# Use shared utils for context, base URL, and request builder
import tests.utils.utils as utils  # noqa: E402


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
    Helper: Replace placeholders like ${user_id} or $user_id with values from shared CONTEXT.
    """
    if not isinstance(text, str):
        return text

    pattern = re.compile(r"\$\{(\w+)\}")

    def replacer(match):
        key = match.group(1)
        return str(utils.CONTEXT.get(key, f"${{{key}}}"))

    text = pattern.sub(replacer, text)

    simple_var_pattern = re.compile(r"\$(?!\{)(\w+)")

    def replacer2(match):
        key = match.group(1)
        return str(utils.CONTEXT.get(key, f"${key}"))

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


def get_default_headers() -> Dict[str, str]:
    """
    Return default headers for API requests.
    """
    # keep this for backward compatibility if other parts reference it;
    # but it will not be used by build_api_request anymore.
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Request-ID": str(ULID()),
        "X-Platform": "integration-test-runner",
    }


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
            utils.CONTEXT[context_key] = val

    # Old capture format support
    captures = step_config.get("capture", {})
    for context_key, json_key in captures.items():
        val = actual_json.get(json_key) if actual_json else None
        if val:
            utils.CONTEXT[context_key] = val

    return True


def list_all_flow(directory_path):
    p = Path(directory_path)
    # Use list comprehension to filter only files
    files = [entry for entry in p.iterdir() if entry.is_file()]
    return files


def _run(env: dict, apis: dict, case: dict) -> Tuple[bool, dict]:
    step_name = case.get("name", "Unnamed Step")
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

    # build_api_request is provided by utils
    req_data = utils.build_api_request(api_info, step_vars)

    # Log request details (compact format)
    method = req_data.get("method", "GET")
    url = req_data.get("url", "")
    logger.info(f"      ▶ {method} {url}")

    # Log request body if present (truncated to avoid exposing sensitive data)
    if "json" in req_data and req_data["json"]:
        body_str = str(req_data["json"])
        # Redact sensitive fields
        sensitive_fields = [
            "access_token",
            "refresh_token",
            "accessToken",
            "refreshToken",
            "password",
            "otp",
        ]
        for field in sensitive_fields:
            if field in body_str:
                body_str = body_str.replace(field, f"{field}[REDACTED]")
        # Truncate if too long
        if len(body_str) > 100:
            body_str = body_str[:100] + "..."
        logger.info(f"        Body: {body_str}")

    response = send_api_request(req_data)

    if response is not None:
        # Log response status (compact format)
        status_icon = "✓" if 200 <= response.status_code < 300 else "✗"
        logger.info(f"      ◀ {status_icon} Status {response.status_code}")

        # Log response body (truncated and redacted)
        response_text = response.text
        # Redact tokens from response
        try:
            import json

            response_json = json.loads(response_text)
            if isinstance(response_json, dict):
                for field in [
                    "access_token",
                    "refresh_token",
                    "accessToken",
                    "refreshToken",
                ]:
                    if field in response_json:
                        response_json[field] = "[REDACTED]"
                    if (
                        isinstance(response_json.get("data"), dict)
                        and field in response_json["data"]
                    ):
                        response_json["data"][field] = "[REDACTED]"
            response_text = json.dumps(response_json)
        except:
            pass
        # Truncate if too long
        if len(response_text) > 200:
            response_text = response_text[:200] + "..."
        logger.debug(f"        Response: {response_text}")
    else:
        logger.error(f"      ◀ ✗ No response received")
        return False, env

    isPassed = validate_api_response(response, case, is_recording_response=False)

    if isPassed:
        # Update env with any captured variables from CONTEXT
        captured_vars = []
        for key, value in case.get("env-vars", {}).items():
            if key in utils.CONTEXT:
                env[key] = utils.CONTEXT[key]
                captured_vars.append(key)

        if captured_vars:
            logger.info(f"      💾 Captured: {', '.join(captured_vars)}")

    return isPassed, env


def run(env: dict, apis: dict) -> bool:
    """
    Main execution loop.
    """
    # Set BASE_URL in shared utils module
    utils.BASE_URL = env.get("base_url", "")
    if not utils.BASE_URL:
        logger.error("❌ base_url not found in environment configuration")
        return False

    logger.info(f"🔗 Base URL: {utils.BASE_URL}")

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

        config_path = str(flow_file)
        test_definition = load_test_definition(config_path)
        if not test_definition:
            logger.error("🚫 No test cases found.\n")
            continue

        if test_definition.get("enabled", True) is False:
            logger.info("⏭️  Flow is disabled. Skipping...\n")
            continue

        logger.info(f"{'='*80}")

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
                        failed_step_details.append(
                            {
                                "flow_file": flow_file.name,
                                "flow_name": flow_name,
                                "step_name": hook_case.get("name"),
                                "step_type": "setup",
                            }
                        )

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
                        failed_step_details.append(
                            {
                                "flow_file": flow_file.name,
                                "flow_name": flow_name,
                                "step_name": step_case.get("name"),
                                "step_type": "test",
                            }
                        )

            if flow_passed:
                passed_flows += 1
                logger.info(f"   ✅ Flow Passed: {flow_name}\n")
            else:
                failed_flows += 1
                logger.info(f"   ❌ Flow Failed: {flow_name}\n")

    # Print summary statistics
    logger.info("" + "=" * 80)
    logger.info("📊 TEST EXECUTION SUMMARY")
    logger.info("=" * 80)
    logger.info(f"📦 Flow Suites: {total_flows} total")
    logger.info(f"   ✅ Passed: {passed_flows}")
    logger.info(f"   ❌ Failed: {failed_flows}")

    logger.info(f"🔧 Test Steps: {total_steps} total")
    logger.info(f"   ✅ Passed: {passed_steps}")
    logger.info(f"   ❌ Failed: {failed_steps}")

    if failed_step_details:
        logger.info(f"{'='*80}")
        logger.info(f"❌ FAILED STEPS ({len(failed_step_details)} failures)")
        logger.info("=" * 80)
        for idx, failure in enumerate(failed_step_details, 1):
            logger.info(f"{idx}. 📁 {failure['flow_file']} → {failure['flow_name']}")
            logger.info(f"   🔹 Step: {failure['step_name']}")
            logger.info(f"   📍 Type: {failure['step_type']}")

    logger.info("" + "=" * 80)

    if all_passed:
        logger.info("🎉 ALL TESTS PASSED!")
        logger.info("=" * 80 + "\n")
        return True
    else:
        logger.error(
            f"💥 TEST FAILURES: {failed_steps}/{total_steps} steps failed in {failed_flows}/{total_flows} flow(s)"
        )
        logger.info("=" * 80 + "\n")
        return False
