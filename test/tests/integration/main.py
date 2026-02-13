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
import sys
import json
from typing import List, Dict, Any
import os
import subprocess
import time
import requests
from typing import Optional

import yaml

from tests.integration import runner

# Assume we have the runner we discussed earlier
# from test_runner import Runner

# --- CONFIGURATION ---
DOCKER_COMPOSE_CMD = ["docker", "compose"]  # or ["docker-compose"] depending on version
REQUIRED_SERVICES = ["postgres", "redis"]  # Services we must wait for
MAX_RETRIES = 120  # Wait up to 120 seconds (2 minutes) for services to be healthy
SLEEP_INTERVAL = 1  # Check every 1 second
COMPOSE_FILE = None  # Will be set in setup_docker()
HEALTH_CHECK_END_POINT = "http://localhost:9009/api/v1/oopsly/actuator/health"

# --- LOGGING SETUP ---
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def check_container_health(service_name: str) -> bool:
    """
    Inspects a specific service container to see if it is 'healthy'.
    Requires HEALTHCHECK to be defined in docker-compose.yml.
    """
    try:
        # Get the container ID for the service
        # This gets the ID of the first container for the service
        cmd_id = DOCKER_COMPOSE_CMD + ["-f", COMPOSE_FILE, "ps", "-q", service_name]
        container_id = subprocess.check_output(cmd_id, text=True).strip()

        if not container_id:
            logger.warning(f"Service '{service_name}' container not found.")
            return False

        # Inspect the container's health status
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

        # If no HEALTHCHECK is defined in Dockerfile, status might be 'null' or empty.
        # In that case, we fallback to checking if it is 'running'.
        if status == "healthy":
            return True
        elif status == "unhealthy":
            return False
        elif status == "starting":
            return False
        else:
            # Fallback: Check if running (for containers without explicit healthchecks)
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
    """
    Starts Spring Boot in the background but BLOCKS the main thread
    ONLY until the health check is successful.
    """
    logger.info("🚀 Starting Application...")
    app_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "api")
    )

    try:
        # 1. Start the process in the background
        # We use Popen so it doesn't wait for the server to exit
        process = subprocess.Popen(
            ["./gradlew", "bootRun", "--args=--spring.profiles.active=test"],
            cwd=app_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        # 2. BLOCK the main thread here until healthy
        logger.info("⏳ Waiting for app to become healthy before starting tests...")

        is_healthy = False
        for i in range(20):  # Give it ~60 seconds total
            if process.poll() is not None:
                stdout, stderr = process.communicate(timeout=1)
                logger.error(
                    f"❌ Spring Boot process exited with code {process.returncode}"
                )
                logger.error(f"STDOUT: {stdout}")
                logger.error(f"STDERR: {stderr}")
                exit(1)

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
                # App isn't listening yet or health check failed, keep waiting
                pass
            except Exception as e:
                # Log unexpected errors but continue waiting
                logger.debug(f"Health check attempt failed: {e}")
            logger.info(f"Waiting for application to be healthy... ({i + 1}/20)")
            time.sleep(5)

        if not is_healthy:
            logger.error("❌ Timeout: Application never became healthy.")
            process.terminate()
            return None

        # Return the process so we can kill it after tests are done
        return process

    except Exception as e:
        logger.error(f"❌ Failed to start application: {e}")
        return None


def setup_docker() -> bool:
    """
    Set up Docker environment for integration tests.
    Returns True if successful, False otherwise.
    """
    global COMPOSE_FILE

    logger.info("🚀 Starting Docker environment...")

    # Use absolute path based on the main.py location
    COMPOSE_FILE = os.path.join(
        os.path.dirname(__file__), "../config/docker-compose-integration.yaml"
    )

    if not os.path.exists(COMPOSE_FILE):
        logger.error(f"❌ Docker Compose file not found: {COMPOSE_FILE}")
        return False

    try:
        # 1. Bring up containers (detached)
        # --wait implies waiting for healthy state, but strictly manual checking is often more reliable/debuggable
        subprocess.run(
            DOCKER_COMPOSE_CMD + ["-f", COMPOSE_FILE, "up", "-d", "--build"], check=True
        )

        # 2. Health Check Loop
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


def load_file(file_path: str) -> Any:
    """
    Load a file and return its content.
    """
    if not file_path:
        return None

    try:
        with open(file_path, "r") as f:
            config = yaml.safe_load(f)
            return config
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"❌ Error loading expected response file '{file_path}': {e}")
        return None


def get_api_definitions() -> (Dict[str, str], Dict[str, any]):
    """
    Load API definitions from a YAML file.
    """
    # Use absolute path based on the main.py location
    config_path = os.path.join(os.path.dirname(__file__), "../config/api.yaml")
    api_data = load_file(config_path)
    if not api_data:
        logger.error("❌ API definitions could not be loaded.")
        exit(1)

    configs = api_data.get("configs", {})
    if not configs:
        logger.error("❌ 'configs' section missing in API definitions.")
        exit(1)

    environments = {}
    if "environments" in configs:
        for k, v in configs["environments"].items():
            environments[k] = v

    apis = {}
    if "apis" in configs:
        for api in configs["apis"]:
            apis[api["name"]] = api

    return environments, apis


def before_test():
    # Remove previous API log files to ensure test runs start with a clean slate
    try:
        logs_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "api", "logs")
        )
        if os.path.isdir(logs_dir):
            logger.info("🧹 Clearing API logs in: %s", logs_dir)
            # Remove files
            for root, _, files in os.walk(logs_dir):
                for fname in files:
                    fpath = os.path.join(root, fname)
                    try:
                        os.remove(fpath)
                        logger.debug("Removed log file: %s", fpath)
                    except Exception as e:
                        logger.warning("Could not remove log file %s: %s", fpath, e)
            # Attempt to remove any empty subdirectories (but keep the logs_dir itself)
            for root, dirs, _ in os.walk(logs_dir, topdown=False):
                for d in dirs:
                    dpath = os.path.join(root, d)
                    try:
                        os.rmdir(dpath)
                        logger.debug("Removed empty log directory: %s", dpath)
                    except OSError:
                        # Directory not empty or removal failed; ignore
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


def main() -> None:
    """Main entry point for running integration tests."""
    skip_docker = os.getenv("SKIP_DOCKER_SETUP", "false").lower() == "true"
    app_process = None  # Initialize to None to prevent UnboundLocalError

    before_test()

    try:
        if skip_docker:
            logger.info("🐳 Skipping Docker setup (managed externally)")
            setup_success = True
        else:
            setup_success = setup_docker()

        if not setup_success:
            logger.error("🛑 Aborting tests due to environment setup failure.")
            sys.exit(1)

        logger.info("✅ Environment setup complete. Starting application...")
        app_process = setup_app()
        # --- EXECUTE RUNNER ---

        logger.info("🧪 Environment Ready. Initializing Test Runner...")
        env, apis = get_api_definitions()
        result = runner.run(env, apis)

        after_test()

        if not result:
            sys.exit(1)

        logger.info("🎉 Integration Tests Passed!")
        sys.exit(0)

    except Exception as e:
        logger.exception(f"💥 An unexpected error occurred: {e}")
        sys.exit(1)

    finally:
        # Safely terminate app process if it was started
        if app_process is not None:
            try:
                app_process.terminate()
                app_process.wait(timeout=5)
            except Exception as e:
                logger.warning(f"Error terminating app process: {e}")

        if not skip_docker:
            tear_down_docker()
        else:
            logger.info("🐳 Skipping Docker teardown (managed externally)")


if __name__ == "__main__":
    main()
