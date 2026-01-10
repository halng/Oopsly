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
Card API Integration Tests
Tests for: GET /decks/{deckId}/cards, POST /decks/{deckId}/cards, 
           GET /decks/{deckId}/cards/{id}, PUT /decks/{deckId}/cards/{id},
           PATCH /decks/{deckId}/cards/{id}, PUT /decks/{deckId}/cards/difficulty

These tests cover:
1. Syntactic Correctness: Schema validation
2. Semantic Integrity: Card CRUD operations within decks
3. Security Compliance: Invalid inputs, authorization
"""

import pytest
import uuid
from tests.integration.utils.schema_validator import validate_response_schema, get_schema_for_response


class TestCardAPI:
    """Test suite for Card management endpoints."""
    
    @pytest.fixture
    def test_deck(self, api_client, test_deck_data):
        """Create a test deck for card operations."""
        response = api_client.post("/decks", json=test_deck_data)
        assert response.status_code == 200
        deck_id = response.json().get("data", {}).get("id")
        return deck_id
    
    # ---------------------------
    # 1. CREATE CARDS (POST /decks/{deckId}/cards)
    # ---------------------------
    
    def test_create_cards_success(self, api_client, test_deck, test_card_data, openapi_spec):
        """
        Test successful card creation with valid data.
        Validates: HTTP 200, response schema.
        """
        response = api_client.post(f"/decks/{test_deck}/cards", json=test_card_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Validate schema
        schema = get_schema_for_response(openapi_spec, "/decks/{deckId}/cards", "post", 200)
        if schema:
            is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
            assert is_valid, f"Response schema validation failed: {error}"
    
    def test_create_cards_invalid_deck(self, api_client, test_card_data):
        """
        Negative test: Create cards in non-existent deck.
        Expected: HTTP 404
        """
        non_existent_deck = str(uuid.uuid4())
        response = api_client.post(f"/decks/{non_existent_deck}/cards", json=test_card_data)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_create_cards_empty_array(self, api_client, test_deck):
        """
        Edge case: Create cards with empty array.
        Expected: HTTP 400 or success with empty result
        """
        empty_data = {"cards": []}
        response = api_client.post(f"/decks/{test_deck}/cards", json=empty_data)
        
        # Either reject empty array or accept it
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
    
    # ---------------------------
    # 2. GET ALL CARDS (GET /decks/{deckId}/cards)
    # ---------------------------
    
    def test_get_all_cards_success(self, api_client, test_deck, test_card_data, openapi_spec):
        """
        Test retrieving all cards in a deck.
        First creates cards, then retrieves them.
        """
        # Create cards first
        api_client.post(f"/decks/{test_deck}/cards", json=test_card_data)
        
        # Retrieve cards
        response = api_client.get(f"/decks/{test_deck}/cards")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Validate schema
        schema = get_schema_for_response(openapi_spec, "/decks/{deckId}/cards", "get", 200)
        if schema:
            is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
            assert is_valid, f"Response schema validation failed: {error}"
    
    def test_get_all_cards_invalid_deck(self, api_client):
        """
        Negative test: Get cards from non-existent deck.
        Expected: HTTP 404
        """
        non_existent_deck = str(uuid.uuid4())
        response = api_client.get(f"/decks/{non_existent_deck}/cards")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ---------------------------
    # 3. GET CARD BY ID (GET /decks/{deckId}/cards/{id})
    # ---------------------------
    
    def test_get_card_by_id_success(self, api_client, test_deck, test_card_data, openapi_spec):
        """
        Test retrieving a specific card by ID.
        """
        # Create cards
        create_response = api_client.post(f"/decks/{test_deck}/cards", json=test_card_data)
        assert create_response.status_code == 200
        
        cards = create_response.json().get("data", [])
        assert len(cards) > 0, "No cards created"
        card_id = cards[0].get("id")
        
        # Retrieve the card
        response = api_client.get(f"/decks/{test_deck}/cards/{card_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Validate schema
        schema = get_schema_for_response(openapi_spec, "/decks/{deckId}/cards/{id}", "get", 200)
        if schema:
            is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
            assert is_valid, f"Response schema validation failed: {error}"
    
    def test_get_card_not_found(self, api_client, test_deck):
        """
        Negative test: Retrieve non-existent card.
        Expected: HTTP 404
        """
        non_existent_card = str(uuid.uuid4())
        response = api_client.get(f"/decks/{test_deck}/cards/{non_existent_card}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ---------------------------
    # 4. UPDATE CARD (PUT /decks/{deckId}/cards/{id})
    # ---------------------------
    
    def test_update_card_success(self, api_client, test_deck, test_card_data, openapi_spec):
        """
        Test updating a card with valid data.
        """
        # Create a card
        create_response = api_client.post(f"/decks/{test_deck}/cards", json=test_card_data)
        card_id = create_response.json().get("data", [])[0].get("id")
        
        # Update the card
        updated_data = {
            "front": "Updated Question",
            "back": "Updated Answer"
        }
        response = api_client.put(f"/decks/{test_deck}/cards/{card_id}", json=updated_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Validate schema
        schema = get_schema_for_response(openapi_spec, "/decks/{deckId}/cards/{id}", "put", 200)
        if schema:
            is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
            assert is_valid, f"Response schema validation failed: {error}"
    
    # ---------------------------
    # 5. DELETE CARD (PATCH /decks/{deckId}/cards/{id})
    # ---------------------------
    
    def test_delete_card_success(self, api_client, test_deck, test_card_data):
        """
        Test deleting a card.
        """
        # Create a card
        create_response = api_client.post(f"/decks/{test_deck}/cards", json=test_card_data)
        card_id = create_response.json().get("data", [])[0].get("id")
        
        # Delete the card
        response = api_client.patch(f"/decks/{test_deck}/cards/{card_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify deletion
        get_response = api_client.get(f"/decks/{test_deck}/cards/{card_id}")
        assert get_response.status_code == 404
    
    # ---------------------------
    # 6. UPDATE DIFFICULTY (PUT /decks/{deckId}/cards/difficulty)
    # ---------------------------
    
    def test_update_difficulty_success(self, api_client, test_deck, test_card_data, openapi_spec):
        """
        Test updating card difficulty (spaced repetition feature).
        """
        # Create a card
        create_response = api_client.post(f"/decks/{test_deck}/cards", json=test_card_data)
        card_id = create_response.json().get("data", [])[0].get("id")
        
        # Update difficulty
        difficulty_data = {
            "cardId": card_id,
            "difficulty": "EASY"  # or MEDIUM, HARD based on the API spec
        }
        response = api_client.put(f"/decks/{test_deck}/cards/difficulty", json=difficulty_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Validate schema
        schema = get_schema_for_response(openapi_spec, "/decks/{deckId}/cards/difficulty", "put", 200)
        if schema:
            is_valid, error = validate_response_schema(response.json(), schema, openapi_spec)
            assert is_valid, f"Response schema validation failed: {error}"


# ---------------------------
# 7. WORKFLOW TESTS
# ---------------------------

class TestCardWorkflows:
    """Test complex card workflows."""
    
    def test_complete_card_lifecycle(self, api_client, test_deck_data, test_card_data):
        """
        Test complete card lifecycle within a deck.
        """
        # Create deck
        deck_response = api_client.post("/decks", json=test_deck_data)
        deck_id = deck_response.json().get("data", {}).get("id")
        
        # Create cards
        cards_response = api_client.post(f"/decks/{deck_id}/cards", json=test_card_data)
        assert cards_response.status_code == 200
        card_id = cards_response.json().get("data", [])[0].get("id")
        
        # Read card
        get_response = api_client.get(f"/decks/{deck_id}/cards/{card_id}")
        assert get_response.status_code == 200
        
        # Update card
        update_response = api_client.put(f"/decks/{deck_id}/cards/{card_id}", 
                                        json={"front": "New Q", "back": "New A"})
        assert update_response.status_code == 200
        
        # Delete card
        delete_response = api_client.patch(f"/decks/{deck_id}/cards/{card_id}")
        assert delete_response.status_code == 200
        
        # Verify deletion
        final_response = api_client.get(f"/decks/{deck_id}/cards/{card_id}")
        assert final_response.status_code == 404
