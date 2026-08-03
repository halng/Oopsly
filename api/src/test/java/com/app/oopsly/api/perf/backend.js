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
if (!profile || !profiles[profile]) throw new Error(`Unsupported TEST_PROFILE '${profile}'`);
if (!baseUrl) throw new Error("BASE_URL is required");
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 499 }));

export const options = { ...profiles[profile], thresholds };
const id = "00000000-0000-0000-0000-000000000000";
const endpoints = [
  ["GET", "/actuator/health"], ["GET", "/users/validate"],
  ["POST", "/users/refresh-token"], ["POST", "/users/logout"],
  ["POST", "/otp"], ["POST", "/otp/validate"],
  ["GET", "/user/profile"], ["PATCH", "/user/profile"], ["PATCH", "/user/settings"],
  ["GET", "/users/me/stats"], ["GET", "/discover"], ["POST", `/discover/${id}/clone`],
  ["GET", "/shelves"], ["POST", "/shelves"], ["GET", `/shelves/${id}`],
  ["PUT", `/shelves/${id}`], ["PATCH", `/shelves/${id}`],
  ["GET", `/shelves/${id}/subjects`], ["POST", `/shelves/${id}/subjects`],
  ["GET", `/shelves/${id}/subjects/${id}`], ["PUT", `/shelves/${id}/subjects/${id}`],
  ["PUT", `/shelves/${id}/subjects/${id}/settings`], ["PATCH", `/shelves/${id}/subjects/${id}`],
  ["GET", `/shelves/${id}/subjects/${id}/cards`], ["POST", `/shelves/${id}/subjects/${id}/cards`],
  ["GET", `/shelves/${id}/subjects/${id}/cards/${id}`], ["PUT", `/shelves/${id}/subjects/${id}/cards/${id}`],
  ["PATCH", `/shelves/${id}/subjects/${id}/cards/${id}`], ["GET", `/shelves/${id}/subjects/${id}/cards/due`],
  ["PUT", `/shelves/${id}/subjects/${id}/cards/difficulty`],
  ["POST", `/shelves/${id}/subjects/${id}/cards/${id}/media`],
  ["GET", "/tags"], ["POST", "/tags"], ["PATCH", `/tags/${id}`],
  ["POST", `/shelves/${id}/subjects/${id}/cards/${id}/tags/${id}`],
  ["GET", `/shelves/${id}/subjects/${id}/cards/by-tag/${id}`],
  ["GET", `/shelves/${id}/test-suites`], ["POST", `/shelves/${id}/test-suites`],
  ["GET", `/shelves/${id}/test-suites/${id}`], ["PUT", `/shelves/${id}/test-suites/${id}`],
  ["PATCH", `/shelves/${id}/test-suites/${id}`], ["POST", `/shelves/${id}/test-suites/auto-generate`],
  ["POST", `/shelves/${id}/test-suites/${id}/run`], ["GET", `/test-suites/${id}/cards`],
  ["GET", `/test-suites/${id}/questions`], ["POST", `/test-suites/${id}/questions`],
  ["GET", `/test-suites/${id}/questions/${id}`], ["PUT", `/test-suites/${id}/questions/${id}`],
  ["PATCH", `/test-suites/${id}/questions/${id}`],
];

export default function () {
  for (const [method, path] of endpoints) {
    const response = http.request(method, `${baseUrl}${path}`, "{}", {
      headers: { "Content-Type": "application/json" }, tags: { endpoint: `${method} ${path}` },
    });
    check(response, { [`${method} ${path} responds`]: (r) => r.status < 500 });
  }
  sleep(1);
}
