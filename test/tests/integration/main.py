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
import subprocess
import time
import sys
import json
import os
from typing import List, Dict, Any

import yaml

from tests.integration import runner

# Assume we have the runner we discussed earlier
# from test_runner import Runner

# --- CONFIGURATION ---
DOCKER_COMPOSE_CMD = ["docker", "compose"]  # or ["docker-compose"] depending on version
REQUIRED_SERVICES = ["postgres", "redis", "oopsly-server"]  # Services we must wait for
MAX_RETRIES = 120  # Wait up to 120 seconds (2 minutes) for services to be healthy
SLEEP_INTERVAL = 1  # Check every 1 second
COMPOSE_FILE = None  # Will be set in setup_docker()

# --- LOGGING SETUP ---
logging.basicConfig(
    level=logging.INFO,
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
                logger.info(f"✅ All services healthy in {duration}s!")
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

    enviroments = {}
    if "environments" in configs:
        for k, v in configs["environments"].items():
            enviroments[k] = v

    apis = {}
    if "apis" in configs:
        for api in configs["apis"]:
            apis[api["name"]] = api

    return enviroments, apis


def main() -> None:
    """Main entry point for running integration tests."""
    try:
        setup_success = setup_docker()

        if not setup_success:
            logger.error("🛑 Aborting tests due to environment setup failure.")
            sys.exit(1)

        # --- EXECUTE RUNNER ---

        logger.info("🧪 Environment Ready. Initializing Test Runner...")
        env, apis = get_api_definitions()
        result = runner.run(env, apis)

        if not result:
            sys.exit(1)

        logger.info("🎉 Integration Tests Passed!")
        sys.exit(0)

    except Exception as e:
        logger.exception(f"💥 An unexpected error occurred: {e}")
        sys.exit(1)

    finally:
        tear_down_docker()


if __name__ == "__main__":
    main()
