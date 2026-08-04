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
import { check, fail, sleep } from "k6";
import { profiles, thresholds } from "./profiles.js";

const profile = __ENV.TEST_PROFILE;
const baseUrl = __ENV.BASE_URL;
const authToken = __ENV.AUTH_TOKEN;

if (!profile || !profiles[profile]) throw new Error(`Unsupported TEST_PROFILE '${profile}'`);
if (!baseUrl) throw new Error("BASE_URL is required");
if (!authToken) throw new Error("AUTH_TOKEN is required");

export const options = { ...profiles[profile], thresholds };
const requestParams = {
  headers: {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  },
};

function request(method, path, body, transaction) {
  const response = http.request(method, `${baseUrl}${path}`, body === null ? null : JSON.stringify(body), {
    ...requestParams,
    tags: { transaction },
  });
  check(response, { [`${transaction} succeeds`]: (result) => result.status >= 200 && result.status < 300 });
  return response;
}

function responseId(response, transaction) {
  try {
    const id = response.json("data.id");
    if (id) return id;
  } catch (_) {
    // The failure below includes the response body for diagnosis.
  }
  fail(`${transaction} did not return data.id: ${response.status} ${response.body}`);
}

export default function () {
  // Every lifecycle starts by inserting a real row. Subsequent reads, updates,
  // and soft deletes therefore measure database work against an existing ID.
  const uniqueName = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const createResponse = request("POST", "/shelves", {
    icon: "book",
    name: uniqueName,
    description: "Performance test fixture shelf",
  }, "shelf.create");
  const shelfId = responseId(createResponse, "shelf.create");

  request("GET", `/shelves/${shelfId}`, null, "shelf.get");
  request("PUT", `/shelves/${shelfId}`, {
    icon: "book-open",
    name: `${uniqueName}-updated`,
    description: "Updated performance fixture shelf",
  }, "shelf.update");
  request("PATCH", `/shelves/${shelfId}`, null, "shelf.soft-delete");
  sleep(1);
}
