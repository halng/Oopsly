#  Copyright (c) 2025 Hal Ng
#  All Rights Reserved.

"""
Performance Test Configuration - Config-driven load testing
"""

import random

# Endpoint configuration - modify weights and thresholds here
ENDPOINT_CONFIG = {
    "GET /decks": {
        "weight": 30,
        "target_rps": 50,
        "thresholds": {"p95_latency_ms": 300, "p99_latency_ms": 800, "error_rate": 0.01},
        "generate_data": lambda: None
    },
    "POST /decks": {
        "weight": 15,
        "target_rps": 20,
        "thresholds": {"p95_latency_ms": 500, "p99_latency_ms": 1000, "error_rate": 0.01},
        "generate_data": lambda: {
            "name": f"Perf Test Deck {random.randint(1000, 9999)}",
            "description": "Performance testing"
        }
    },
    "GET /decks/{id}": {
        "weight": 20,
        "target_rps": 30,
        "thresholds": {"p95_latency_ms": 300, "p99_latency_ms": 700, "error_rate": 0.01},
        "requires_setup": "deck_id"
    },
    "POST /decks/{deckId}/cards": {
        "weight": 10,
        "target_rps": 15,
        "thresholds": {"p95_latency_ms": 600, "p99_latency_ms": 1200, "error_rate": 0.01},
        "generate_data": lambda: {"cards": [{"front": f"Q{random.randint(1,1000)}", "back": "Answer"}]},
        "requires_setup": "deck_id"
    },
    "POST /otp": {
        "weight": 3,
        "target_rps": 5,
        "thresholds": {"p95_latency_ms": 500, "p99_latency_ms": 1000, "error_rate": 0.01},
        "generate_data": lambda: {"identifier": f"test{random.randint(1000,9999)}@example.com"}
    }
}

# Global test configuration
PERFORMANCE_CONFIG = {
    "baseline_load": {
        "duration_minutes": 30,
        "total_target_rps": 100,
        "max_vus": 500
    },
    "stress_test": {
        "stages": [
            {"duration_minutes": 2, "target_vus": 50},
            {"duration_minutes": 5, "target_vus": 100},
            {"duration_minutes": 5, "target_vus": 200},
            {"duration_minutes": 5, "target_vus": 400}
        ]
    }
}
