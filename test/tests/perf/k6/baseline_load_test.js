/*
 * Copyright (c) 2025 Hal Ng
 * All Rights Reserved.
 *
 * K6 Baseline Load Test - Ramping Arrival Rate Pattern
 * Objective: Verify system handles expected daily traffic
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const deckCreationTrend = new Trend('deck_creation_duration');

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:9009/api/v1/oopsly';
const TARGET_RPS = __ENV.TARGET_RPS || 100;

export const options = {
    scenarios: {
        baseline_load: {
            executor: 'ramping-arrival-rate',
            startRate: 10,
            timeUnit: '1s',
            preAllocatedVUs: 50,
            maxVUs: 500,
            stages: [
                { duration: '5m', target: TARGET_RPS },
                { duration: '20m', target: TARGET_RPS },
                { duration: '5m', target: 10 },
            ],
        },
    },
    thresholds: {
        'http_req_duration': ['p(95)<500', 'p(99)<1000'],
        'errors': ['rate<0.01'],
        'http_req_failed': ['rate<0.01'],
    },
};

export default function () {
    const testScenario = Math.random();
    
    if (testScenario < 0.6) {
        getAllDecks();
    } else if (testScenario < 0.9) {
        createDeck();
    } else {
        const deckId = createDeck();
        if (deckId) {
            addCardsToDeck(deckId);
        }
    }
    
    sleep(1);
}

function getAllDecks() {
    const response = http.get(`${BASE_URL}/decks`);
    const success = check(response, {
        'get decks status 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
}

function createDeck() {
    const payload = JSON.stringify({
        name: `Test Deck ${Date.now()}`,
        description: 'Load test deck',
    });
    
    const response = http.post(`${BASE_URL}/decks`, payload, {
        headers: { 'Content-Type': 'application/json' },
    });
    
    const success = check(response, {
        'create deck status 200': (r) => r.status === 200,
    });
    
    errorRate.add(!success);
    deckCreationTrend.add(response.timings.duration);
    
    return success ? response.json('data.id') : null;
}

function addCardsToDeck(deckId) {
    const payload = JSON.stringify({
        cards: [
            { front: 'Q1', back: 'A1' },
            { front: 'Q2', back: 'A2' },
        ],
    });
    
    const response = http.post(`${BASE_URL}/decks/${deckId}/cards`, payload, {
        headers: { 'Content-Type': 'application/json' },
    });
    
    check(response, { 'add cards status 200': (r) => r.status === 200 });
}
