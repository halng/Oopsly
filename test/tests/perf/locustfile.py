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

from locust import HttpUser, task, between, tag
import json
import uuid


class OopslyAPIUser(HttpUser):
    """
    Enhanced Locust user for comprehensive API testing.
    Simulates realistic user behavior across all endpoints.
    """
    
    # Simulate real human behavior with think time
    wait_time = between(1, 3)
    
    # Base path for API
    host = "http://localhost:9009/api/v1/oopsly"
    
    def on_start(self):
        """Initialize test data when user starts."""
        self.created_deck_ids = []
        self.created_card_ids = []
    
    # ---------------------------
    # DECK OPERATIONS (Weight: 5)
    # ---------------------------
    
    @task(3)
    @tag('deck', 'read')
    def get_all_decks(self):
        """Read all decks - most common operation."""
        with self.client.get("/decks", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Get all decks failed: {response.status_code}")
    
    @task(2)
    @tag('deck', 'write')
    def create_deck(self):
        """Create a new deck."""
        payload = {
            "name": f"Locust Test Deck {uuid.uuid4().hex[:8]}",
            "description": "Deck created during performance testing"
        }
        
        with self.client.post("/decks", 
                             json=payload,
                             catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    deck_id = data.get("data", {}).get("id")
                    if deck_id:
                        self.created_deck_ids.append(deck_id)
                    response.success()
                except json.JSONDecodeError:
                    response.failure("Invalid JSON response")
            else:
                response.failure(f"Create deck failed: {response.status_code}")
    
    @task(1)
    @tag('deck', 'read')
    def get_deck_by_id(self):
        """Read a specific deck."""
        if self.created_deck_ids:
            deck_id = self.created_deck_ids[0]
            with self.client.get(f"/decks/{deck_id}", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Get deck by ID failed: {response.status_code}")
    
    @task(1)
    @tag('deck', 'write')
    def update_deck(self):
        """Update an existing deck."""
        if self.created_deck_ids:
            deck_id = self.created_deck_ids[0]
            payload = {
                "name": f"Updated Deck {uuid.uuid4().hex[:8]}",
                "description": "Updated during performance testing"
            }
            
            with self.client.put(f"/decks/{deck_id}",
                               json=payload,
                               catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Update deck failed: {response.status_code}")
    
    # ---------------------------
    # CARD OPERATIONS (Weight: 4)
    # ---------------------------
    
    @task(2)
    @tag('card', 'write')
    def create_cards(self):
        """Create cards in a deck."""
        if self.created_deck_ids:
            deck_id = self.created_deck_ids[0]
            payload = {
                "cards": [
                    {
                        "front": f"Question {uuid.uuid4().hex[:8]}",
                        "back": "Answer from performance test"
                    },
                    {
                        "front": "What is load testing?",
                        "back": "Testing system performance under load"
                    }
                ]
            }
            
            with self.client.post(f"/decks/{deck_id}/cards",
                                json=payload,
                                catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Create cards failed: {response.status_code}")
    
    @task(2)
    @tag('card', 'read')
    def get_all_cards(self):
        """Get all cards in a deck."""
        if self.created_deck_ids:
            deck_id = self.created_deck_ids[0]
            with self.client.get(f"/decks/{deck_id}/cards", 
                               catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Get cards failed: {response.status_code}")
    
    # ---------------------------
    # OTP OPERATIONS (Weight: 1)
    # ---------------------------
    
    @task(1)
    @tag('otp', 'security')
    def generate_otp(self):
        """Generate OTP for authentication testing."""
        payload = {
            "identifier": f"loadtest+{uuid.uuid4().hex[:8]}@example.com"
        }
        
        with self.client.post("/otp",
                            json=payload,
                            catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Generate OTP failed: {response.status_code}")
    
    # ---------------------------
    # WORKFLOW SCENARIOS
    # ---------------------------
    
    @task(1)
    @tag('workflow', 'comprehensive')
    def complete_user_workflow(self):
        """
        Simulate a complete user journey:
        1. Create a deck
        2. Add cards to it
        3. Retrieve the cards
        4. Update the deck
        """
        # Step 1: Create deck
        deck_payload = {
            "name": f"Workflow Deck {uuid.uuid4().hex[:8]}",
            "description": "Complete workflow test"
        }
        
        deck_response = self.client.post("/decks", json=deck_payload)
        if deck_response.status_code != 200:
            return
        
        deck_id = deck_response.json().get("data", {}).get("id")
        if not deck_id:
            return
        
        # Step 2: Add cards
        cards_payload = {
            "cards": [
                {"front": "Q1", "back": "A1"},
                {"front": "Q2", "back": "A2"}
            ]
        }
        self.client.post(f"/decks/{deck_id}/cards", json=cards_payload)
        
        # Step 3: Retrieve cards
        self.client.get(f"/decks/{deck_id}/cards")
        
        # Step 4: Update deck
        update_payload = {
            "name": "Updated Workflow Deck",
            "description": "Updated in workflow"
        }
        self.client.put(f"/decks/{deck_id}", json=update_payload)
