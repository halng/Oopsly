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
from pathlib import Path
from typing import Dict, Any


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
def api_base_url(openapi_spec) -> str:
    """
    Extract the base URL from the OpenAPI specification.
    This ensures tests always target the correct environment.
    """
    servers = openapi_spec.get("servers", [])
    if not servers:
        pytest.fail("No servers defined in OpenAPI specification")
    
    # Use the first server as default, or allow override via environment variable
    base_url = os.getenv("API_BASE_URL", servers[0]["url"])
    return base_url


@pytest.fixture(scope="session")
def api_client(api_base_url):
    """
    Create a reusable HTTP client configured with the API base URL.
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
    
    return APIClient(api_base_url, session)


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
