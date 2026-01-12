/*
 * Copyright (c) 2025 Hal Ng
 * All Rights Reserved.
 *
 * Generic K6 Load Test - Config-Driven
 * Reads endpoint configuration and generates load tests dynamically
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { generateReport } from './report_generator.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

// Configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:9009/api/v1/oopsly';
const TEST_TYPE = __ENV.TEST_TYPE || 'baseline';  // baseline, stress, spike, soak
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || '100');

// Endpoint configuration (loaded from config file or defined here)
const endpointConfig = {
    'GET /decks': { weight: 30, data: null },
    'POST /decks': { 
        weight: 15, 
        data: () => ({ name: `Test Deck ${Date.now()}`, description: 'Load test' })
    },
    'GET /decks/{id}': { weight: 20, requiresSetup: true },
    'POST /decks/{deckId}/cards': { 
        weight: 10, 
        data: () => ({ cards: [{ front: 'Q1', back: 'A1' }] }),
        requiresSetup: true
    },
    'POST /otp': { 
        weight: 3, 
        data: () => ({ identifier: `test${Math.floor(Math.random()*10000)}@example.com` })
    }
};

// Test configuration based on type
const testConfigs = {
    baseline: {
        executor: 'ramping-arrival-rate',
        startRate: 10,
        timeUnit: '1s',
        preAllocatedVUs: 50,
        maxVUs: 500,
        stages: [
            { duration: '5m', target: TARGET_RPS },
            { duration: '20m', target: TARGET_RPS },
            { duration: '5m', target: 10 }
        ]
    },
    stress: {
        executor: 'ramping-vus',
        startVUs: 10,
        stages: [
            { duration: '2m', target: 50 },
            { duration: '5m', target: 100 },
            { duration: '5m', target: 200 },
            { duration: '5m', target: 400 }
        ]
    },
    spike: {
        executor: 'ramping-vus',
        startVUs: 10,
        stages: [
            { duration: '1m', target: 10 },
            { duration: '10s', target: 500 },
            { duration: '3m', target: 500 },
            { duration: '10s', target: 10 }
        ]
    }
};

export const options = {
    scenarios: {
        load_test: testConfigs[TEST_TYPE] || testConfigs.baseline
    },
    thresholds: {
        'http_req_duration': ['p(95)<500', 'p(99)<1000'],
        'errors': ['rate<0.01'],
        'http_req_failed': ['rate<0.01']
    }
};

// Setup: Create test data
let createdDeckIds = [];

export function setup() {
    console.log(`Starting ${TEST_TYPE} test against ${BASE_URL}`);
    console.log(`Target RPS: ${TARGET_RPS}`);
    
    // Create some decks for tests that need them
    const setupDeckIds = [];
    for (let i = 0; i < 5; i++) {
        const payload = JSON.stringify({
            name: `Setup Deck ${i}`,
            description: 'Created during setup'
        });
        
        const response = http.post(`${BASE_URL}/decks`, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.status === 200) {
            try {
                const data = JSON.parse(response.body);
                if (data.data && data.data.id) {
                    setupDeckIds.push(data.data.id);
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
    }
    
    return { deckIds: setupDeckIds };
}

// Main test function
export default function(data) {
    // Select endpoint based on weights
    const endpoint = selectEndpoint();
    
    // Execute the endpoint test
    executeEndpoint(endpoint, data);
    
    // Simulate user think time
    sleep(1);
}

function selectEndpoint() {
    // Weighted random selection
    const totalWeight = Object.values(endpointConfig).reduce((sum, config) => sum + config.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [endpoint, config] of Object.entries(endpointConfig)) {
        random -= config.weight;
        if (random <= 0) {
            return endpoint;
        }
    }
    
    return 'GET /decks';  // Fallback
}

function executeEndpoint(endpoint, setupData) {
    const config = endpointConfig[endpoint];
    const [method, path] = endpoint.split(' ');
    
    let url = `${BASE_URL}${path}`;
    let payload = null;
    
    // Handle path parameters
    if (config.requiresSetup && setupData.deckIds && setupData.deckIds.length > 0) {
        const deckId = setupData.deckIds[Math.floor(Math.random() * setupData.deckIds.length)];
        url = url.replace('{id}', deckId).replace('{deckId}', deckId);
    } else if (config.requiresSetup) {
        // Skip if no setup data available
        return;
    }
    
    // Generate request body
    if (config.data && typeof config.data === 'function') {
        payload = JSON.stringify(config.data());
    }
    
    // Make request
    const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: endpoint }
    };
    
    let response;
    if (method === 'GET') {
        response = http.get(url, params);
    } else if (method === 'POST') {
        response = http.post(url, payload, params);
    } else if (method === 'PUT') {
        response = http.put(url, payload, params);
    } else if (method === 'PATCH') {
        response = http.patch(url, payload, params);
    } else if (method === 'DELETE') {
        response = http.del(url, params);
    }
    
    // Check response
    const success = check(response, {
        'status is 2xx': (r) => r.status >= 200 && r.status < 300
    });
    
    errorRate.add(!success);
    apiLatency.add(response.timings.duration);
}

export function teardown(data) {
    console.log(`${TEST_TYPE} test complete`);
}

// Generate reports at the end of the test
export function handleSummary(data) {
    return generateReport(data);
}
