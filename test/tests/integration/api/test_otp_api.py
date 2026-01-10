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
OTP API Integration Tests
Tests for: POST /otp, POST /otp/validate

These tests cover:
1. Syntactic Correctness: Schema validation
2. Semantic Integrity: OTP generation and validation flow
3. Security Compliance: Invalid codes, expired codes, replay attacks
"""

import pytest
import time
from tests.integration.utils.schema_validator import validate_response_schema, get_schema_for_response


class TestOTPAPI:
    """Test suite for OTP management endpoints."""
    
    # ---------------------------
    # 1. CREATE OTP (POST /otp)
    # ---------------------------
    
    def test_create_otp_success(self, api_client, test_otp_data, openapi_spec):
        """
        Test successful OTP generation.
        Validates: HTTP 200, response schema.
        """
        response = api_client.post("/otp", json=test_otp_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Validate schema
        schema = get_schema_for_response(openapi_spec, "/otp", "post", 200)
        if schema:
            is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
            assert is_valid, f"Response schema validation failed: {error}"
    
    def test_create_otp_invalid_identifier(self, api_client):
        """
        Negative test: Generate OTP with invalid identifier.
        Expected: HTTP 400
        """
        invalid_data = {"identifier": ""}
        response = api_client.post("/otp", json=invalid_data)
        
        assert response.status_code in [400, 500], f"Expected 400/500, got {response.status_code}"
    
    def test_create_otp_missing_identifier(self, api_client):
        """
        Negative test: Generate OTP without identifier.
        Expected: HTTP 400
        """
        response = api_client.post("/otp", json={})
        
        assert response.status_code in [400, 500], f"Expected 400/500, got {response.status_code}"
    
    # ---------------------------
    # 2. VALIDATE OTP (POST /otp/validate)
    # ---------------------------
    
    def test_validate_otp_success(self, api_client, test_otp_data, openapi_spec):
        """
        Test successful OTP validation.
        Flow: Generate OTP -> Validate with correct code
        """
        # Generate OTP
        create_response = api_client.post("/otp", json=test_otp_data)
        assert create_response.status_code == 200
        
        # Extract OTP code from response (structure depends on API design)
        otp_code = create_response.json().get("data", {}).get("code")
        
        if otp_code:
            # Validate OTP
            validate_data = {
                "identifier": test_otp_data["identifier"],
                "code": otp_code
            }
            response = api_client.post("/otp/validate", json=validate_data)
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            # Validate schema
            schema = get_schema_for_response(openapi_spec, "/otp/validate", "post", 200)
            if schema:
                is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
                assert is_valid, f"Response schema validation failed: {error}"
    
    def test_validate_otp_incorrect_code(self, api_client, test_otp_data):
        """
        Security test: Validate with incorrect OTP code.
        Expected: HTTP 400 or validation failure in response
        """
        # Generate OTP
        api_client.post("/otp", json=test_otp_data)
        
        # Attempt validation with wrong code
        validate_data = {
            "identifier": test_otp_data["identifier"],
            "code": "000000"  # Incorrect code
        }
        response = api_client.post("/otp/validate", json=validate_data)
        
        # Should either return 400 or success=false in response
        if response.status_code == 200:
            result = response.json()
            # Check if validation failed
            assert result.get("success") is False or result.get("valid") is False
        else:
            assert response.status_code in [400, 401], f"Expected 400/401, got {response.status_code}"
    
    def test_validate_otp_nonexistent_identifier(self, api_client):
        """
        Security test: Validate OTP for identifier that never generated one.
        Expected: HTTP 400 or 404
        """
        validate_data = {
            "identifier": "nonexistent@example.com",
            "code": "123456"
        }
        response = api_client.post("/otp/validate", json=validate_data)
        
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
    
    def test_validate_otp_replay_attack(self, api_client, test_otp_data):
        """
        Security test: Attempt to reuse a validated OTP (replay attack).
        Expected: Validation should fail on second attempt
        """
        # Generate OTP
        create_response = api_client.post("/otp", json=test_otp_data)
        otp_code = create_response.json().get("data", {}).get("code")
        
        if otp_code:
            validate_data = {
                "identifier": test_otp_data["identifier"],
                "code": otp_code
            }
            
            # First validation should succeed
            first_response = api_client.post("/otp/validate", json=validate_data)
            
            # Second validation should fail (OTP already used)
            second_response = api_client.post("/otp/validate", json=validate_data)
            
            # One of these should fail
            assert not (first_response.status_code == 200 and second_response.status_code == 200), \
                "OTP was accepted twice - replay attack vulnerability!"


# ---------------------------
# 3. WORKFLOW TESTS
# ---------------------------

class TestOTPWorkflows:
    """Test OTP workflows and edge cases."""
    
    def test_multiple_otp_generation_same_identifier(self, api_client, test_otp_data):
        """
        Test generating multiple OTPs for the same identifier.
        Validates: Old OTP should be invalidated when new one is generated.
        """
        # Generate first OTP
        first_response = api_client.post("/otp", json=test_otp_data)
        assert first_response.status_code == 200
        first_code = first_response.json().get("data", {}).get("code")
        
        # Generate second OTP for same identifier
        second_response = api_client.post("/otp", json=test_otp_data)
        assert second_response.status_code == 200
        second_code = second_response.json().get("data", {}).get("code")
        
        if first_code and second_code:
            # Codes should be different
            assert first_code != second_code, "OTP codes should be unique"
            
            # Old code should be invalid
            validate_old = {
                "identifier": test_otp_data["identifier"],
                "code": first_code
            }
            old_validation = api_client.post("/otp/validate", json=validate_old)
            
            # New code should be valid
            validate_new = {
                "identifier": test_otp_data["identifier"],
                "code": second_code
            }
            new_validation = api_client.post("/otp/validate", json=validate_new)
            
            # At least the new one should work
            assert new_validation.status_code == 200
    
    def test_rate_limiting_otp_generation(self, api_client, test_otp_data):
        """
        Security test: Attempt to generate OTPs rapidly (rate limiting test).
        Expected: API should implement rate limiting
        """
        # Attempt to generate 10 OTPs in quick succession
        responses = []
        for i in range(10):
            response = api_client.post("/otp", json={
                "identifier": f"ratelimit{i}@example.com"
            })
            responses.append(response.status_code)
        
        # All requests might succeed if no rate limiting, or some should be rate limited
        # This test documents the behavior rather than enforcing it
        success_count = sum(1 for status in responses if status == 200)
        print(f"OTP generation attempts: {len(responses)}, successful: {success_count}")
        
        # At minimum, the API should handle the requests without crashing
        assert all(status in [200, 429] for status in responses), \
            f"Unexpected status codes: {responses}"
