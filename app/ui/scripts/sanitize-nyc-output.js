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

/**
 * Drop Metro virtual module coverage keys (null-byte "\0shim:...") before nyc
 * writes lcov-report paths. Node refuses mkdir with null bytes in the path.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const nycFilename = path.join(root, ".nyc_output", "out.json");

function isInvalidCoveragePath(filePath) {
  return (
    typeof filePath !== "string" ||
    filePath.includes("\0") ||
    /(?:^|[/\\])\0?shim:/.test(filePath)
  );
}

function sanitizeCoverageObject(coverage) {
  let removed = 0;
  for (const key of Object.keys(coverage)) {
    if (isInvalidCoveragePath(key)) {
      delete coverage[key];
      removed += 1;
    }
  }
  return removed;
}

if (!fs.existsSync(nycFilename)) {
  console.warn(`sanitize-nyc-output: missing ${nycFilename} (skipped)`);
  process.exit(0);
}

const coverage = JSON.parse(fs.readFileSync(nycFilename, "utf8"));
const removed = sanitizeCoverageObject(coverage);
fs.writeFileSync(nycFilename, JSON.stringify(coverage));
if (removed > 0) {
  console.log(
    `sanitize-nyc-output: removed ${removed} Metro virtual coverage path(s)`,
  );
}
