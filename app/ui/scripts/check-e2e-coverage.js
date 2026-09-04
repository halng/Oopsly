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
 * Enforce minimum coverage on UI areas historically excluded from Jest
 * (screen/ + app/(user)/), using the Cypress Istanbul report.
 *
 * Thresholds are intentionally below the Jest 80% gate because e2e hits
 * happy paths first; raise toward 90% as specs deepen.
 */
const fs = require("fs");
const path = require("path");
const { createCoverageMap } = require("istanbul-lib-coverage");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(
  root,
  "coverage-cypress",
  "coverage-final.json",
);

const THRESHOLDS = {
  lines: 50,
  statements: 50,
  functions: 45,
  branches: 35,
};

const INCLUDE_RE =
  /[\\/](screen|app[\\/]\(user\))[\\/].+\.(tsx?|jsx?)$/;

if (!fs.existsSync(reportPath)) {
  console.error(
    `check-e2e-coverage: missing ${reportPath}. Run e2e with CYPRESS_COVERAGE=true first.`,
  );
  process.exit(1);
}

const map = createCoverageMap(JSON.parse(fs.readFileSync(reportPath, "utf8")));
const filtered = createCoverageMap({});

for (const file of map.files()) {
  if (INCLUDE_RE.test(file)) {
    filtered.addFileCoverage(map.fileCoverageFor(file));
  }
}

if (filtered.files().length === 0) {
  console.error(
    "check-e2e-coverage: no screen/ or app/(user)/ files in Cypress coverage. Is babel istanbul instrumentation enabled?",
  );
  process.exit(1);
}

const summary = filtered.getCoverageSummary();
console.log("check-e2e-coverage: screen/ + app/(user)/ summary");
console.log(
  JSON.stringify(
    {
      files: filtered.files().length,
      lines: summary.lines.pct,
      statements: summary.statements.pct,
      functions: summary.functions.pct,
      branches: summary.branches.pct,
    },
    null,
    2,
  ),
);

let failed = false;
for (const [metric, min] of Object.entries(THRESHOLDS)) {
  const pct = summary[metric].pct;
  if (typeof pct !== "number" || Number.isNaN(pct) || pct < min) {
    console.error(
      `check-e2e-coverage: ${metric} ${pct}% < required ${min}%`,
    );
    failed = true;
  } else {
    console.log(`check-e2e-coverage: ${metric} ${pct}% >= ${min}%`);
  }
}

process.exit(failed ? 1 : 0);
