/*
 * Copyright (c) 2025 Hal Ng
 * All Rights Reserved.
 *
 * K6 Soak Test - Endurance Testing
 * Objective: Detect memory leaks and degradation over time
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { generateReport } from './report_generator.js';

const errorRate = new Rate('errors');
const totalRequests = new Counter('total_requests');
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:9009/api/v1/oopsly';

export const options = {
    scenarios: {
        soak_test: {
            executor: 'constant-vus',
            vus: 50,
            duration: '4h',  // 4 hour soak test
        },
    },
    thresholds: {
        'http_req_duration': ['p(95)<500', 'p(99)<1000'],
        'errors': ['rate<0.01'],
        'http_req_failed': ['rate<0.01'],
    },
};

export default function () {
    totalRequests.add(1);
    
    // Mix of operations to simulate real usage
    const operations = [
        () => http.get(`${BASE_URL}/decks`),
        () => {
            const payload = JSON.stringify({
                name: `Soak Test Deck ${Date.now()}`,
                description: 'Endurance test',
            });
            return http.post(`${BASE_URL}/decks`, payload, {
                headers: { 'Content-Type': 'application/json' },
            });
        },
    ];
    
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const response = operation();
    
    const success = check(response, {
        'status is 200': (r) => r.status === 200,
    });
    
    errorRate.add(!success);
    
    // Realistic user think time
    sleep(2);
}

export function setup() {
    console.log('Starting soak test - 4 hour endurance run');
    console.log('Monitor: memory usage, connection pools, error rates over time');
}

export function teardown() {
    console.log('Soak test complete - check for memory leaks and degradation');
}

// Generate reports at the end of the test
export function handleSummary(data) {
    return generateReport(data);
}
