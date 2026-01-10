#  Copyright (c) 2025 Hal Ng
#  All Rights Reserved.
#
#  This software and associated documentation files (the "Software") are licensed
#  under the MIT License.

"""
Response Recorder for WireMock
Records API responses during test execution for WireMock stub generation.
"""

import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
import requests


class WireMockRecorder:
    """Records API responses in WireMock-compatible format."""
    
    def __init__(self, output_dir: str = "wiremock/mappings"):
        """Initialize recorder with output directory."""
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.recorded_count = 0
    
    def record_response(self, 
                       method: str,
                       url: str,
                       request_body: Optional[Dict[str, Any]],
                       response: requests.Response,
                       scenario_name: Optional[str] = None):
        """
        Record an API response in WireMock format.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL (path only, no host)
            request_body: Request body dict
            response: Response object
            scenario_name: Optional scenario name for grouping
        """
        # Generate unique ID for this mapping
        mapping_id = self._generate_mapping_id(method, url, request_body)
        
        # Create WireMock stub mapping
        mapping = {
            "id": mapping_id,
            "name": f"{method} {url}",
            "request": self._build_request_pattern(method, url, request_body),
            "response": self._build_response(response),
            "metadata": {
                "recorded_at": datetime.now().isoformat(),
                "scenario": scenario_name
            }
        }
        
        # Save to file
        filename = f"{method.lower()}_{self._sanitize_filename(url)}.json"
        filepath = self.output_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(mapping, f, indent=2)
        
        self.recorded_count += 1
        return filepath
    
    def _generate_mapping_id(self, method: str, url: str, body: Optional[Dict]) -> str:
        """Generate unique mapping ID."""
        content = f"{method}:{url}:{json.dumps(body) if body else ''}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _sanitize_filename(self, url: str) -> str:
        """Sanitize URL for filename."""
        return url.replace('/', '_').replace('{', '').replace('}', '').strip('_')
    
    def _build_request_pattern(self, 
                               method: str, 
                               url: str, 
                               body: Optional[Dict]) -> Dict[str, Any]:
        """Build WireMock request pattern."""
        pattern = {
            "method": method.upper(),
            "urlPathPattern": self._convert_to_regex_pattern(url)
        }
        
        if body:
            pattern["bodyPatterns"] = [
                {"matchesJsonPath": f"$.{key}"} for key in body.keys()
            ]
        
        return pattern
    
    def _convert_to_regex_pattern(self, url: str) -> str:
        """Convert URL with path params to regex pattern."""
        # Convert {id} to regex patterns
        import re
        pattern = url
        # Replace {uuid} params with UUID regex
        pattern = re.sub(r'\{[^}]+\}', r'[a-f0-9-]{36}', pattern)
        return pattern
    
    def _build_response(self, response: requests.Response) -> Dict[str, Any]:
        """Build WireMock response."""
        wiremock_response = {
            "status": response.status_code,
            "headers": dict(response.headers)
        }
        
        # Add body if present
        if response.text:
            try:
                wiremock_response["jsonBody"] = response.json()
            except json.JSONDecodeError:
                wiremock_response["body"] = response.text
        
        return wiremock_response
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get recording statistics."""
        return {
            "total_recorded": self.recorded_count,
            "output_directory": str(self.output_dir),
            "files": list(self.output_dir.glob("*.json"))
        }


class RecordingAPIClient:
    """API client wrapper that records responses."""
    
    def __init__(self, api_client, recorder: WireMockRecorder):
        """Initialize with base client and recorder."""
        self.api_client = api_client
        self.recorder = recorder
        self.scenario_name = None
    
    def set_scenario(self, name: str):
        """Set current scenario name for grouping recordings."""
        self.scenario_name = name
    
    def request(self, method: str, path: str, **kwargs) -> requests.Response:
        """Make request and record response."""
        response = self.api_client.request(method, path, **kwargs)
        
        # Record the response
        request_body = kwargs.get('json')
        self.recorder.record_response(
            method=method,
            url=path,
            request_body=request_body,
            response=response,
            scenario_name=self.scenario_name
        )
        
        return response
    
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
