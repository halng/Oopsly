/*
 * Copyright (c) 2025 Hal Ng
 * All Rights Reserved.
 *
 * K6 Spike Test - Resilience Testing
 * Objective: Test sudden extreme traffic surges
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { generateReport } from './report_generator.js';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:9009/api/v1/oopsly';

export const options = {
    scenarios: {
        spike_test: {
            executor: 'ramping-vus',
            startVUs: 10,
            stages: [
                { duration: '1m', target: 10 },      // Normal load
                { duration: '10s', target: 500 },    // Sudden spike!
                { duration: '3m', target: 500 },     // Hold spike
                { duration: '10s', target: 10 },     // Drop back
                { duration: '2m', target: 10 },      // Recovery
            ],
        },
    },
    thresholds: {
        'http_req_duration': ['p(95)<3000'],
        'errors': ['rate<0.10'],  // Allow 10% errors during spike
    },
};

export default function () {
    const response = http.get(`${BASE_URL}/decks`);
    
    const success = check(response, {
        'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
    });
    
    errorRate.add(!success);
    sleep(0.3);
}

export function setup() {
    console.log('Starting spike test - simulating sudden traffic surge');
}

// Generate reports at the end of the test
export function handleSummary(data) {
    return generateReport(data);
}
