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

export const profiles = {
  smoke: { vus: 1, duration: "30s" },
  flaky: { vus: 3, duration: "2m" },
  stress: {
    stages: [
      { duration: "2m", target: 50 },
      { duration: "5m", target: 50 },
      { duration: "2m", target: 0 },
    ],
  },
  spike: {
    stages: [
      { duration: "30s", target: 10 },
      { duration: "15s", target: 200 },
      { duration: "1m", target: 10 },
    ],
  },
};

export const thresholds = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(90)<300", "p(95)<500", "p(99)<1000"],
  checks: ["rate>0.99"],
};
