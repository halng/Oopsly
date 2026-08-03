/* Copyright 2026 Hao Nguyen Tan - Licensed under Apache-2.0 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { profiles, thresholds } from './profiles.js';

const profile = __ENV.TEST_PROFILE || 'smoke';
export const options = { ...profiles[profile], thresholds };
const baseUrl = __ENV.BASE_URL || 'http://localhost:9009/api/v1/oopsly';

export default function () {
  const response = http.get(`${baseUrl}/actuator/health`, { tags: { suite: profile } });
  check(response, { 'status is 200': (r) => r.status === 200, 'response below 1s': (r) => r.timings.duration < 1000 });
  sleep(1);
}
