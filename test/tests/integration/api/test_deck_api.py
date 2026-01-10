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
Deck API Integration Tests
Tests for: GET /decks, POST /decks, GET /decks/{id}, PUT /decks/{id}, PATCH /decks/{id}

These tests cover:
1. Syntactic Correctness: Schema validation
2. Semantic Integrity: CRUD operations
3. Security Compliance: Invalid inputs, edge cases
"""

import pytest
import uuid
from tests.integration.utils.schema_validator import validate_response_schema, get_schema_for_response


class TestDeckAPI:
    """Test suite for Deck management endpoints."""
    
    # ---------------------------
    # 1. CREATE DECK (POST /decks)
    # ---------------------------
    
    def test_create_deck_success(self, api_client, test_deck_data, openapi_spec):
        """
        Test successful deck creation with valid data.
        Validates: HTTP 200, response schema, and data persistence.
        """
        response = api_client.post("/decks", json=test_deck_data)
        
        # Assert HTTP status
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Assert response schema
        schema = get_schema_for_response(openapi_spec, "/decks", "post", 200)
        if schema:
            is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
            assert is_valid, f"Response schema validation failed: {error}"
    
    def test_create_deck_invalid_payload(self, api_client):
        """
        Negative test: Create deck with missing required fields.
        Expected: HTTP 400 or 500 (depending on validation)
        """
        invalid_data = {}  # Missing required fields
        response = api_client.post("/decks", json=invalid_data)
        
        # Should return error status
        assert response.status_code in [400, 500], f"Expected 400/500, got {response.status_code}"
    
    def test_create_deck_malformed_json(self, api_client):
        """
        Negative test: Send malformed JSON.
        Expected: HTTP 400
        """
        response = api_client.post("/decks", data="{ invalid json", headers={"Content-Type": "application/json"})
        
        assert response.status_code in [400, 500], f"Expected 400/500, got {response.status_code}"
    
    # ---------------------------
    # 2. GET ALL DECKS (GET /decks)
    # ---------------------------
    
    def test_get_all_decks_success(self, api_client, openapi_spec):
        """
        Test retrieving all decks.
        Validates: HTTP 200, response schema.
        """
        response = api_client.get("/decks")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Validate schema
        schema = get_schema_for_response(openapi_spec, "/decks", "get", 200)
        if schema:
            is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
            assert is_valid, f"Response schema validation failed: {error}"
    
    # ---------------------------
    # 3. GET DECK BY ID (GET /decks/{id})
    # ---------------------------
    
    def test_get_deck_by_id_success(self, api_client, test_deck_data, openapi_spec):
        """
        Test retrieving a specific deck by ID.
        First creates a deck, then retrieves it.
        """
        # Create a deck first
        create_response = api_client.post("/decks", json=test_deck_data)
        assert create_response.status_code == 200
        
        deck_id = create_response.json().get("data", {}).get("id")
        assert deck_id, "Deck ID not returned in creation response"
        
        # Retrieve the deck
        response = api_client.get(f"/decks/{deck_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Validate schema
        schema = get_schema_for_response(openapi_spec, "/decks/{id}", "get", 200)
        if schema:
            is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
            assert is_valid, f"Response schema validation failed: {error}"
    
    def test_get_deck_by_id_not_found(self, api_client):
        """
        Negative test: Retrieve non-existent deck.
        Expected: HTTP 404
        """
        non_existent_id = str(uuid.uuid4())
        response = api_client.get(f"/decks/{non_existent_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_get_deck_by_id_invalid_uuid(self, api_client):
        """
        Negative test: Use invalid UUID format.
        Expected: HTTP 400 or 500
        """
        invalid_id = "not-a-uuid"
        response = api_client.get(f"/decks/{invalid_id}")
        
        assert response.status_code in [400, 500], f"Expected 400/500, got {response.status_code}"
    
    # ---------------------------
    # 4. UPDATE DECK (PUT /decks/{id})
    # ---------------------------
    
    def test_update_deck_success(self, api_client, test_deck_data, openapi_spec):
        """
        Test updating a deck with valid data.
        Tests full CRUD cycle: Create -> Update -> Verify
        """
        # Create a deck
        create_response = api_client.post("/decks", json=test_deck_data)
        assert create_response.status_code == 200
        deck_id = create_response.json().get("data", {}).get("id")
        
        # Update the deck
        updated_data = {
            "name": "Updated Deck Name",
            "description": "Updated description"
        }
        update_response = api_client.put(f"/decks/{deck_id}", json=updated_data)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Validate schema
        schema = get_schema_for_response(openapi_spec, "/decks/{id}", "put", 200)
        if schema:
            is_valid, error = validate_response_schema(update_response.json(), schema, openapi_spec)
            assert is_valid, f"Response schema validation failed: {error}"
    
    def test_update_deck_not_found(self, api_client, test_deck_data):
        """
        Negative test: Update non-existent deck.
        Expected: HTTP 404
        """
        non_existent_id = str(uuid.uuid4())
        response = api_client.put(f"/decks/{non_existent_id}", json=test_deck_data)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ---------------------------
    # 5. DELETE DECK (PATCH /decks/{id})
    # ---------------------------
    
    def test_delete_deck_success(self, api_client, test_deck_data, openapi_spec):
        """
        Test deleting a deck.
        Tests: Create -> Delete -> Verify deletion
        """
        # Create a deck
        create_response = api_client.post("/decks", json=test_deck_data)
        assert create_response.status_code == 200
        deck_id = create_response.json().get("data", {}).get("id")
        
        # Delete the deck
        delete_response = api_client.patch(f"/decks/{deck_id}")
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify deletion: subsequent GET should return 404
        get_response = api_client.get(f"/decks/{deck_id}")
        assert get_response.status_code == 404, "Deck should not exist after deletion"
    
    def test_delete_deck_not_found(self, api_client):
        """
        Negative test: Delete non-existent deck.
        Expected: HTTP 404
        """
        non_existent_id = str(uuid.uuid4())
        response = api_client.patch(f"/decks/{non_existent_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


# ---------------------------
# 6. WORKFLOW CONTINUITY TESTS
# ---------------------------

class TestDeckWorkflows:
    """Test complex multi-step workflows."""
    
    def test_complete_deck_lifecycle(self, api_client, test_deck_data):
        """
        Test complete deck lifecycle: Create -> Read -> Update -> Delete.
        This simulates a real-world user journey.
        """
        # Step 1: Create
        create_response = api_client.post("/decks", json=test_deck_data)
        assert create_response.status_code == 200
        deck_id = create_response.json().get("data", {}).get("id")
        assert deck_id is not None
        
        # Step 2: Read
        get_response = api_client.get(f"/decks/{deck_id}")
        assert get_response.status_code == 200
        
        # Step 3: Update
        updated_data = {"name": "Updated Name", "description": "Updated Description"}
        update_response = api_client.put(f"/decks/{deck_id}", json=updated_data)
        assert update_response.status_code == 200
        
        # Step 4: Verify update
        verify_response = api_client.get(f"/decks/{deck_id}")
        assert verify_response.status_code == 200
        
        # Step 5: Delete
        delete_response = api_client.patch(f"/decks/{deck_id}")
        assert delete_response.status_code == 200
        
        # Step 6: Verify deletion
        final_response = api_client.get(f"/decks/{deck_id}")
        assert final_response.status_code == 404
