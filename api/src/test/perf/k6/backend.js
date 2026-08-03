/*
 *    Copyright 2026 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { profiles, thresholds } from "./profiles.js";

const profile = __ENV.TEST_PROFILE;
const baseUrl = __ENV.BASE_URL;

if (!profile) {
  throw new Error("TEST_PROFILE is required");
}
if (!profiles[profile]) {
  throw new Error(`Unsupported TEST_PROFILE '${profile}'`);
}
if (!baseUrl) {
  throw new Error("BASE_URL is required");
}

export const options = { ...profiles[profile], thresholds };

export default function () {
  const response = http.get(`${baseUrl}/actuator/health`, { tags: { suite: profile } });
  check(response, {
    "status is 200": (r) => r.status === 200,
    "response below 1s": (r) => r.timings.duration < 1000,
  });
  sleep(1);
}
