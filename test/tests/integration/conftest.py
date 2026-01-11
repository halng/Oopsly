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

import json
import os
import pytest
import requests
import time
import subprocess
from pathlib import Path
from typing import Dict, Any


# Optional: Enable response recording for WireMock
ENABLE_RECORDING = os.getenv("ENABLE_RECORDING", "false").lower() == "true"

# Docker integration settings
USE_DOCKER = os.getenv("USE_DOCKER", "true").lower() == "true"
DOCKER_STARTUP_TIMEOUT = int(os.getenv("DOCKER_STARTUP_TIMEOUT", "120"))


def wait_for_api_health(base_url: str, timeout: int = 120) -> bool:
    """
    Wait for the API server to become healthy.
    
    Args:
        base_url: Base URL of the API
        timeout: Maximum time to wait in seconds
    
    Returns:
        True if API is healthy, False otherwise
    """
    start_time = time.time()
    health_endpoint = f"{base_url}/actuator/health"
    
    print(f"\nWaiting for API at {base_url} to become healthy...")
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(health_endpoint, timeout=5)
            if response.status_code == 200:
                print(f"✅ API is healthy!")
                return True
        except requests.exceptions.RequestException:
            pass
        
        # Show progress
        elapsed = int(time.time() - start_time)
        if elapsed % 10 == 0:
            print(f"⏳ Still waiting... ({elapsed}s elapsed)")
        
        time.sleep(2)
    
    print(f"❌ API did not become healthy within {timeout}s")
    return False


@pytest.fixture(scope="session", autouse=True)
def docker_services():
    """
    Automatically start Docker services if USE_DOCKER=true.
    Runs once per test session.
    """
    if not USE_DOCKER:
        print("\n⚠️  Docker integration disabled (USE_DOCKER=false)")
        print("Make sure the API server is running manually!")
        yield
        return
    
    print("\n🐳 Starting Docker services for integration tests...")
    
    test_dir = Path(__file__).parent.parent.parent
    compose_file = test_dir / "docker-compose.test.yml"
    
    if not compose_file.exists():
        pytest.fail(f"Docker compose file not found: {compose_file}")
    
    # Start services
    try:
        subprocess.run(
            ["docker-compose", "-f", str(compose_file), "up", "-d", "--build"],
            check=True,
            cwd=str(test_dir),
            capture_output=True
        )
        print("✅ Docker services started")
        
        # Wait for API to be healthy
        api_url = os.getenv("API_BASE_URL", "http://localhost:9009")
        if not wait_for_api_health(api_url, timeout=DOCKER_STARTUP_TIMEOUT):
            # Show logs if startup failed
            subprocess.run(
                ["docker-compose", "-f", str(compose_file), "logs", "--tail=50"],
                cwd=str(test_dir)
            )
            pytest.fail("API server did not become healthy in time")
        
        yield
        
        # Cleanup: Stop services after tests
        print("\n🧹 Stopping Docker services...")
        subprocess.run(
            ["docker-compose", "-f", str(compose_file), "down"],
            cwd=str(test_dir),
            capture_output=True
        )
        print("✅ Docker services stopped")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start Docker services: {e}")
        print(f"Output: {e.output}")
        pytest.fail(f"Docker setup failed: {e}")
    except FileNotFoundError:
        pytest.fail("docker-compose command not found. Please install Docker Compose.")


@pytest.fixture(scope="session")
def openapi_spec() -> Dict[str, Any]:
    """
    Load and parse the OpenAPI specification JSON file.
    This serves as the deterministic contract for all API tests.
    """
    spec_path = Path(__file__).parent.parent.parent.parent.parent / "api" / "src" / "main" / "resources" / "openapi.json"
    
    with open(spec_path, 'r') as f:
        spec = json.load(f)
    
    return spec


@pytest.fixture(scope="session")
def api_base_url(openapi_spec, docker_services) -> str:
    """
    Extract the base URL from the OpenAPI specification.
    This ensures tests always target the correct environment.
    Depends on docker_services to ensure services are ready.
    """
    # Default to Docker environment if USE_DOCKER is enabled
    if USE_DOCKER:
        default_url = "http://localhost:9009"
    else:
        servers = openapi_spec.get("servers", [])
        default_url = servers[0]["url"] if servers else "http://localhost:9009"
    
    # Allow override via environment variable
    base_url = os.getenv("API_BASE_URL", default_url)
    
    # Verify API is reachable
    try:
        response = requests.get(f"{base_url}/actuator/health", timeout=5)
        if response.status_code != 200:
            pytest.fail(f"API health check failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        pytest.fail(f"Cannot reach API at {base_url}: {e}")
    
    return base_url


@pytest.fixture(scope="session")
def api_client(api_base_url):
    """
    Create a reusable HTTP client configured with the API base URL.
    Optionally wraps with response recorder for WireMock integration.
    """
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Accept": "application/json"
    })
    
    class APIClient:
        def __init__(self, base_url: str, session: requests.Session):
            self.base_url = base_url
            self.session = session
        
        def request(self, method: str, path: str, **kwargs) -> requests.Response:
            """Make an API request with automatic URL construction."""
            url = f"{self.base_url}{path}" if not path.startswith("http") else path
            return self.session.request(method, url, **kwargs)
        
        def get(self, path: str, **kwargs) -> requests.Response:
            return self.request("GET", path, **kwargs)
        
        def post(self, path: str, **kwargs) -> requests.Response:
            return self.request("POST", path, **kwargs)
        
        def put(self, path: str, **kwargs) -> requests.Response:
            return self.request("PUT", path, **kwargs)
        
        def patch(self, path: str, **kwargs) -> requests.Response:
            return self.request("PATCH", path, **kwargs)
        
        def delete(self, path: str, **kwargs) -> requests.Response:
            return self.request("DELETE", path, **kwargs)
    
    client = APIClient(api_base_url, session)
    
    # Optionally wrap with recording client
    if ENABLE_RECORDING:
        from tests.integration.utils.response_recorder import WireMockRecorder, RecordingAPIClient
        recorder = WireMockRecorder(output_dir="wiremock/mappings")
        client = RecordingAPIClient(client, recorder)
    
    return client


@pytest.fixture
def test_deck_data():
    """
    Provide valid test data for deck creation.
    """
    return {
        "name": "Integration Test Deck",
        "description": "A deck created for integration testing"
    }


@pytest.fixture
def test_card_data():
    """
    Provide valid test data for card creation.
    """
    return {
        "cards": [
            {
                "front": "What is API testing?",
                "back": "The process of verifying API functionality, performance, and security"
            }
        ]
    }


@pytest.fixture
def test_otp_data():
    """
    Provide valid test data for OTP generation.
    """
    return {
        "identifier": "test@example.com"
    }
