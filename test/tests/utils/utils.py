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

# New module: helper functions for building API requests used by the integration runner.
import re
import os
import sys
import json
import time
import yaml
import logging
import subprocess
from typing import Any, Dict, Optional
from ulid import ULID
import requests
from pathlib import Path

logger = logging.getLogger(__name__)

# Shared runtime context and base URL used by runner, locust and other tools
CONTEXT: Dict[str, Any] = {}
BASE_URL: str = ""

# Docker / environment defaults (used by setup_docker)
DOCKER_COMPOSE_CMD = ["docker", "compose"]
REQUIRED_SERVICES = ["postgres", "redis"]
MAX_RETRIES = 120
SLEEP_INTERVAL = 1
COMPOSE_FILE: Optional[str] = None

# Health endpoint used to check app readiness (same as before)
# This may be overridden by callers if needed
HEALTH_CHECK_END_POINT = "http://localhost:9009/api/v1/oopsly/actuator/health"


# ------------------------
# Existing variable substitution + build_api_request (moved and adapted)
# ------------------------
def _substitute_variables(text: Any, context: Dict[str, Any]) -> Any:
    """
    Helper: Replace placeholders like ${user_id} or $user_id with values from provided context.
    Accepts non-string and returns it unchanged.
    """
    if not isinstance(text, str):
        return text

    # First, handle ${variable_name} format (e.g., ${AUTH_TOKEN})
    pattern = re.compile(r"\$\{(\w+)\}")

    def replacer(match):
        key = match.group(1)
        return str(context.get(key, f"${{{key}}}"))

    text = pattern.sub(replacer, text)

    # Then handle $variable_name format (e.g., $EMAIL)
    simple_var_pattern = re.compile(r"\$(?!\{)(\w+)")

    def replacer2(match):
        key = match.group(1)
        return str(context.get(key, f"${key}"))

    return simple_var_pattern.sub(replacer2, text)


def _process_data_with_context(data: Any, context: Dict[str, Any]) -> Any:
    """
    Recursively walk through dicts/lists and substitute variables using provided context.
    """
    if isinstance(data, dict):
        return {k: _process_data_with_context(v, context) for k, v in data.items()}
    elif isinstance(data, list):
        return [_process_data_with_context(item, context) for item in data]
    elif isinstance(data, str):
        return _substitute_variables(data, context)
    else:
        return data


def get_default_headers() -> Dict[str, str]:
    """
    Return default headers for API requests.
    """
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Request-ID": str(ULID()),
        "X-Platform": "integration-test-runner",
    }


def build_api_request(api_info: dict, step_vars: dict = None) -> dict:
    """
    Prepare the request dictionary, substituting variables using the shared CONTEXT
    and optional step_vars. Uses module-level CONTEXT and BASE_URL.
    """
    if step_vars is None:
        step_vars = {}

    # Working context is current CONTEXT plus resolved stepVars
    original_context = CONTEXT.copy()

    # Resolve step_vars (allow string substitution)
    resolved_step_vars = {}
    for key, value in step_vars.items():
        if isinstance(value, str):
            resolved_step_vars[key] = _substitute_variables(value, original_context)
        else:
            resolved_step_vars[key] = value

    working_context = original_context.copy()
    working_context.update(resolved_step_vars)

    # 1. Build URL: base_url + endpoint with variable substitution
    endpoint = _substitute_variables(api_info.get("endpoint", ""), working_context)
    url = (BASE_URL or "") + endpoint

    # 2. Substitute variables in Headers
    headers = {}
    for key, value in api_info.get("headers", {}).items():
        headers[key] = _substitute_variables(value, working_context)
    # Merge default headers (default values should not overwrite explicit headers)
    default_headers = get_default_headers()
    for k, v in default_headers.items():
        headers.setdefault(k, v)

    # 3. Build Body with variable substitution
    body = None
    if "body" in api_info:
        body = {}
        for key, field_def in api_info["body"].items():
            if isinstance(field_def, dict) and "value" in field_def:
                raw_val = field_def["value"]
                # If value is $VAR and context[VAR] is dict/list, use as-is (no stringify)
                if (
                    isinstance(raw_val, str)
                    and raw_val.startswith("$")
                    and len(raw_val) > 1
                ):
                    var_name = raw_val[1:].split(".")[0].split("[")[0]
                    ctx_val = working_context.get(var_name)
                    if isinstance(ctx_val, (dict, list)):
                        body[key] = ctx_val
                    else:
                        body[key] = _substitute_variables(raw_val, working_context)
                else:
                    body[key] = _substitute_variables(raw_val, working_context)
            else:
                body[key] = _substitute_variables(field_def, working_context)

    # 4. Build Query Params with variable substitution
    params = {}
    if "query-params" in api_info:
        for key, param_def in api_info["query-params"].items():
            if isinstance(param_def, dict) and "value" in param_def:
                params[key] = _substitute_variables(param_def["value"], working_context)
            else:
                params[key] = _substitute_variables(param_def, working_context)

    result = {
        "method": api_info.get("method", "GET").upper(),
        "url": url,
        "headers": headers,
        "params": params,
    }

    if body:
        result["json"] = body

    return result


# ------------------------
# Environment helpers moved from main.py
# ------------------------
def check_container_health(service_name: str) -> bool:
    try:
        cmd_id = DOCKER_COMPOSE_CMD + ["-f", COMPOSE_FILE, "ps", "-q", service_name]
        container_id = subprocess.check_output(cmd_id, text=True).strip()

        if not container_id:
            logger.warning(f"Service '{service_name}' container not found.")
            return False

        cmd_inspect = [
            "docker",
            "inspect",
            "--format",
            "{{json .State.Health.Status}}",
            container_id,
        ]
        status = (
            subprocess.check_output(cmd_inspect, text=True).strip().replace('"', "")
        )

        if status == "healthy":
            return True
        elif status in ("unhealthy", "starting"):
            return False
        else:
            cmd_state = [
                "docker",
                "inspect",
                "--format",
                "{{json .State.Status}}",
                container_id,
            ]
            state = (
                subprocess.check_output(cmd_state, text=True).strip().replace('"', "")
            )
            return state == "running"

    except subprocess.CalledProcessError:
        return False


def setup_app() -> Optional[subprocess.Popen]:
    logger.info("🚀 Starting Application...")
    # Find repo root similar to previous code and locate api dir
    repo_root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..")
    )
    app_dir = os.path.join(repo_root, "api")

    try:
        process = subprocess.Popen(
            ["./gradlew", "bootRun", "--args=--spring.profiles.active=test"],
            cwd=app_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        logger.info("⏳ Waiting for app to become healthy before starting tests...")

        is_healthy = False
        for i in range(20):
            if process.poll() is not None:
                try:
                    stdout, stderr = process.communicate(timeout=1)
                except Exception:
                    stdout, stderr = "", ""
                logger.error(
                    f"❌ Spring Boot process exited with code {process.returncode}"
                )
                logger.error(f"STDOUT: {stdout}")
                logger.error(f"STDERR: {stderr}")
                return None

            logger.info("...checking health status...")
            try:
                response = requests.get(HEALTH_CHECK_END_POINT, timeout=2)
                if (
                    response.status_code == 200
                    and response.json().get("status") == "UP"
                ):
                    logger.info("✅ Application is UP! Proceeding to tests...")
                    is_healthy = True
                    break
            except (
                requests.ConnectionError,
                requests.Timeout,
                requests.RequestException,
            ):
                pass
            except Exception as e:
                logger.debug(f"Health check attempt failed: {e}")

            logger.info(f"Waiting for application to be healthy... ({i + 1}/20)")
            time.sleep(5)

        if not is_healthy:
            logger.error("❌ Timeout: Application never became healthy.")
            process.terminate()
            return None

        return process

    except Exception as e:
        logger.error(f"❌ Failed to start application: {e}")
        return None


def setup_docker() -> bool:
    """
    Bring up docker environment and wait for required services to be healthy.
    """
    global COMPOSE_FILE
    logger.info("🚀 Starting Docker environment...")
    COMPOSE_FILE = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__), "..", "config", "docker-compose-integration.yaml"
        )
    )

    if not os.path.exists(COMPOSE_FILE):
        logger.error(f"❌ Docker Compose file not found: {COMPOSE_FILE}")
        return False

    try:
        subprocess.run(
            DOCKER_COMPOSE_CMD + ["-f", COMPOSE_FILE, "up", "-d", "--build"], check=True
        )

        logger.info(f"⏳ Waiting for services: {', '.join(REQUIRED_SERVICES)}...")
        start_time = time.time()

        while True:
            healthy_count = 0
            for service in REQUIRED_SERVICES:
                if check_container_health(service):
                    healthy_count += 1

            if healthy_count == len(REQUIRED_SERVICES):
                duration = round(time.time() - start_time, 2)
                logger.info(f"✅ All container services healthy in {duration}s!")
                return True

            if time.time() - start_time > MAX_RETRIES:
                logger.error("❌ Timeout waiting for services to become healthy.")
                return False

            time.sleep(SLEEP_INTERVAL)

    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to run docker command: {e}")
        return False
    except KeyboardInterrupt:
        logger.warning("\n⚠️ Setup interrupted by user.")
        return False


def tear_down_docker():
    logger.info("🧹 Tearing down Docker environment...")
    if COMPOSE_FILE and os.path.exists(COMPOSE_FILE):
        subprocess.run(DOCKER_COMPOSE_CMD + ["-f", COMPOSE_FILE, "down"], check=False)
    else:
        logger.warning(
            "⚠️ Compose file not found for teardown, attempting default teardown"
        )
        subprocess.run(DOCKER_COMPOSE_CMD + ["down"], check=False)


def load_file(file_path: str) -> Optional[dict]:
    if not file_path:
        return None
    try:
        with open(file_path, "r") as f:
            return yaml.safe_load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"❌ Error loading file '{file_path}': {e}")
        return None


def get_api_definitions() -> (Dict[str, str], Dict[str, Any]):
    config_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "config", "api.yaml")
    )
    api_data = load_file(config_path)
    if not api_data:
        logger.error("❌ API definitions could not be loaded.")
        return {}, {}

    configs = api_data.get("configs", {})
    environments = configs.get("environments", {})
    apis_list = configs.get("apis", [])
    apis = {api["name"]: api for api in apis_list if "name" in api}
    return environments, apis


def before_test():
    try:
        logs_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "api", "logs")
        )
        if os.path.isdir(logs_dir):
            logger.info("🧹 Clearing API logs in: %s", logs_dir)
            for root, _, files in os.walk(logs_dir):
                for fname in files:
                    fpath = os.path.join(root, fname)
                    try:
                        os.remove(fpath)
                        logger.debug("Removed log file: %s", fpath)
                    except Exception as e:
                        logger.warning("Could not remove log file %s: %s", fpath, e)
            for root, dirs, _ in os.walk(logs_dir, topdown=False):
                for d in dirs:
                    dpath = os.path.join(root, d)
                    try:
                        os.rmdir(dpath)
                        logger.debug("Removed empty log directory: %s", dpath)
                    except OSError:
                        pass
        else:
            logger.debug("No api logs directory to clear: %s", logs_dir)
    except Exception as e:
        logger.warning("Failed to clear API logs directory: %s", e)


def after_test():
    try:
        logs_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "api", "logs")
        )
        if os.path.isdir(logs_dir):
            logger.error("=== BEGIN API LOGS (%s) ===", logs_dir)
            for root, _, files in os.walk(logs_dir):
                for fname in sorted(files):
                    fpath = os.path.join(root, fname)
                    rel = os.path.relpath(fpath, logs_dir)
                    logger.error("--- FILE: %s ---", rel)
                    try:
                        with open(fpath, "r", encoding="utf-8", errors="replace") as fh:
                            for line in fh:
                                logger.error(line.rstrip())
                    except Exception as e:
                        logger.error("Could not read %s: %s", fpath, e)
            logger.error("=== END API LOGS ===")
        else:
            logger.error("API logs directory not found: %s", logs_dir)
    except Exception as e:
        logger.exception("Failed to print API logs: %s", e)
