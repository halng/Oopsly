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
from typing import Dict, Any, Optional, List
from deepdiff import DeepDiff
from pathlib import Path


# --- CONFIGURATION ---
logger = logging.getLogger(__name__)

# Global Context to store variables shared between steps
# (e.g. {"user_id": 123, "token": "abc"})
CONTEXT: Dict[str, Any] = {}

def load_test_definition(file_path: str = "tests/config.yaml") -> Dict[str, Any]:
    """
    Load API configuration (Test Cases) from a YAML file.
    """
    if not os.path.exists(file_path):
        logger.error(f"❌ Config file not found: {file_path}")
        return []

    try:
        with open(file_path, 'r') as f:
            config = yaml.safe_load(f)
            # Support both list of cases or dictionary with 'cases' key
            return config.get('cases', config) if isinstance(config, dict) else config
    except yaml.YAMLError as e:
        logger.error(f"❌ Error parsing YAML: {e}")
        return []

def _substitute_variables(text: str) -> str:
    """
    Helper: Replace placeholders like ${user_id} with values from CONTEXT.
    """
    if not isinstance(text, str):
        return text

    # Regex to find ${variable_name}
    pattern = re.compile(r'\$\{(\w+)\}')

    def replacer(match):
        key = match.group(1)
        # Return value from CONTEXT if exists, else keep original placeholder
        # converting to str because re.sub expects string return
        return str(CONTEXT.get(key, f"${{{key}}}"))

    return pattern.sub(replacer, text)

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

def build_api_request(test_case: dict) -> dict:
    """
    Prepare the request dictionary, substituting variables from Context.
    """

    # 1. Substitute variables in URL (e.g. /users/${user_id})
    url = _substitute_variables(test_case.get('url'))

    # 2. Substitute variables in Body, Headers, Params
    headers = _process_data_with_context(test_case.get('headers', {}))
    body = _process_data_with_context(test_case.get('body'))
    params = _process_data_with_context(test_case.get('query-params', {}))
    # Handle path variables if defined separately in YAML, though usually they are in URL

    return {
        "method": test_case.get('method', 'GET').upper(),
        "url": url,
        "json": body,
        "headers": headers,
        "params": params
    }

def send_api_request(request_data: dict) -> Optional[requests.Response]:
    """
    Send the API request using the requests library.
    """
    try:
        method = request_data.pop('method')
        url = request_data.pop('url')

        logger.info(f"📡 Sending {method} {url}")

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
        with open(file_path, 'r') as f:
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

def validate_api_response(
        response: requests.Response,
        test_config: dict,
        is_recording_response: bool = False
) -> bool:
    """
    Validate status code and body.
    Returns True if passed, False otherwise.
    """
    if response is None:
        return False

    expected_res_config = test_config.get('response', {})

    # 1. Validate Status Code
    expected_status = expected_res_config.get('status-code')
    if expected_status and response.status_code != expected_status:
        logger.error(f"❌ Status Mismatch! Expected {expected_status}, Got {response.status_code}")
        logger.debug(f"Response Body: {response.text}")
        return False

    # 2. Extract Response JSON
    try:
        actual_json = response.json() if response.content else None
    except json.JSONDecodeError:
        logger.error("❌ Response is not valid JSON")
        return False

    # 3. Capture Variables (Store data for future steps)
    # YAML Example: capture: { "user_id": "id" } -> Stores response['id'] as ${user_id}
    captures = test_config.get('capture', {})
    for context_key, json_key in captures.items():
        # Simple key access. For nested keys, use jsonpath-ng logic here.
        val = actual_json.get(json_key) if actual_json else None
        if val:
            CONTEXT[context_key] = val
            logger.info(f"💾 Captured variable: {context_key} = {val}")

    # 4. Validate Body (Snapshot Testing)
    expected_file = expected_res_config.get('response-body')

    # RECORDING MODE: Auto-generate expected files
    if is_recording_response and expected_file and actual_json:
        os.makedirs(os.path.dirname(expected_file), exist_ok=True)
        with open(expected_file, 'w') as f:
            json.dump(actual_json, f, indent=2)
        logger.warning(f"📼 Recorded snapshot: {expected_file}")
        return True

    if expected_file:
        expected_json = load_expected_response(expected_file)
        if expected_json:
            # Mask dynamic fields before comparing
            _mask_dynamic_fields(actual_json, expected_json)

            # Deep Diff comparison (ignore order for lists)
            diff = DeepDiff(expected_json, actual_json, ignore_order=True)
            if diff:
                logger.error(f"❌ JSON Body Mismatch in '{test_config.get('name')}'")
                logger.error(diff.to_json(indent=2))
                return False

    logger.info(f"✅ Test Passed: {test_config.get('name')}")
    return True



def list_all_flow(directory_path):
    p = Path(directory_path)
    # Use list comprehension to filter only files
    files = [entry for entry in p.iterdir() if entry.is_file()]
    return files

def _run(env: dict, apis: dict ,case: dict) -> (bool, dict):
    logger.info(f"   🔹 Hook Step: {case.get('name')}")
    if not case:
        logger.error(f"❌ API '{case.get('api')}' not found for hook step '{case.get('name')}'")
        return False

    api_info = apis.get(case.get("api"))
    if not api_info:
        logger.error(f"❌ API '{case.get('api')}' not found for hook step '{case.get('name')}'")
        return False
    req_data = build_api_request(api_info)
    response = send_api_request(req_data)
    isPassed = validate_api_response(response, case, is_recording_response=False)
    if isPassed:
#         TODO: set global varoiables from response if needed
        if "env-vars" in case:
            for k,v in case["env-vars"].items():
                env[k] = v
    return isPassed, env

def run(env: dict, apis: dict) -> bool:
    """
    Main execution loop.
    """
    test_flows = list_all_flow('./flows')
    logger.info(f"🚀 Starting Test Runner: {len(test_flows)} flows found.")
    all_passed = True

    for flow in test_flows:
        logger.info(f"🔹 Running Flow: {flow.name}")
        config_path = str(flow)
        test_definition = load_test_definition(config_path)
        if not test_definition:
            logger.error("🚫 No test cases found.")
            continue

        logger.info(f"🧪 Loaded flow from {config_path}")
        flows = test_definition.get("flows", [])
        for integrate_flow in flows:
            flow_name = integrate_flow.get("flow", "Unnamed Flow")
            flow_description = integrate_flow.get("description", "Unnamed Flow")
            logger.info(f"🔸 Starting Flow: {flow_name}, Description: {flow_description}")

            before_all_hook = integrate_flow.get("before-all")
            if before_all_hook:
                logger.info(f"🔸 Executing Before-All Hook for Flow: {flow_name}. Including {len(before_all_hook)} steps")
                for hook_case in before_all_hook:
                    passed, env = _run(env, apis, hook_case)
                    if not passed:
                        all_passed = False
                    logger.info(f"   🔹 Completed Step: {hook_case.get('name')} with status: {'Passed' if passed else 'Failed'}")

            main_steps = integrate_flow.get("steps", [])
            logger.info(f"🔸 Executing Main Steps for Flow: {flow_name}. Including {len(main_steps)} steps")
            for step_case in main_steps:
                passed, env = _run(env,apis, step_case)
                if not passed:
                    all_passed = False
                logger.info(f"   🔹 Completed Step: {step_case.get('name')} with status: {'Passed' if passed else 'Failed'}")


    if all_passed:
        logger.info("🎉 All tests passed successfully!")
        return True
    else:
        logger.error("💥 Some tests failed.")
        return False