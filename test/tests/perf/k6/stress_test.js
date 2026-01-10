/*
 * Copyright (c) 2025 Hal Ng
 * All Rights Reserved.
 *
 * K6 Stress Test - Capacity Planning
 * Objective: Identify system breaking point and failure mode
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:9009/api/v1/oopsly';

export const options = {
    scenarios: {
        stress_test: {
            executor: 'ramping-vus',
            startVUs: 10,
            stages: [
                { duration: '2m', target: 50 },      // Warm up
                { duration: '5m', target: 100 },     // Normal load
                { duration: '5m', target: 200 },     // High load
                { duration: '5m', target: 400 },     // Stress
                { duration: '5m', target: 600 },     // Breaking point
                { duration: '5m', target: 800 },     // Beyond limits
                { duration: '5m', target: 0 },       // Recovery
            ],
        },
    },
    thresholds: {
        'http_req_duration': ['p(95)<2000'],  // Allow higher latency
        'errors': ['rate<0.05'],               // Allow up to 5% errors
    },
};

export default function () {
    const response = http.get(`${BASE_URL}/decks`);
    
    const success = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 5s': (r) => r.timings.duration < 5000,
    });
    
    errorRate.add(!success);
    sleep(0.5);
}

export function setup() {
    console.log('Starting stress test - finding breaking point');
}

export function teardown() {
    console.log('Stress test complete - review error rates and latency at each stage');
}
