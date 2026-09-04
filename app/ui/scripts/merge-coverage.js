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
 * Merge Jest (coverage/coverage-final.json) and Cypress (.nyc_output)
 * into coverage-combined/ for a unified LCOV + text report.
 */
const fs = require("fs");
const path = require("path");
const { createCoverageMap } = require("istanbul-lib-coverage");
const { createContext } = require("istanbul-lib-report");
const reports = require("istanbul-reports");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "coverage-combined");
const nycDir = path.join(outDir, ".nyc_output");

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadNycOutputDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJsonIfExists(path.join(dir, name)))
    .filter(Boolean);
}

fs.mkdirSync(nycDir, { recursive: true });

function stripInvalidCoveragePaths(coverage) {
  if (!coverage || typeof coverage !== "object") return coverage;
  for (const key of Object.keys(coverage)) {
    if (
      typeof key !== "string" ||
      key.includes("\0") ||
      /(?:^|[/\\])\0?shim:/.test(key)
    ) {
      delete coverage[key];
    }
  }
  return coverage;
}

const map = createCoverageMap({});

const jestCoverage = stripInvalidCoveragePaths(
  readJsonIfExists(path.join(root, "coverage", "coverage-final.json")),
);
if (jestCoverage) {
  map.merge(jestCoverage);
  console.log("merge-coverage: merged Jest coverage/coverage-final.json");
} else {
  console.warn("merge-coverage: Jest coverage-final.json not found (skipped)");
}

const cypressFiles = [
  ...loadNycOutputDir(path.join(root, ".nyc_output")),
  readJsonIfExists(path.join(root, "coverage-cypress", "coverage-final.json")),
]
  .filter(Boolean)
  .map(stripInvalidCoveragePaths);

if (cypressFiles.length === 0) {
  console.warn("merge-coverage: no Cypress coverage found (skipped)");
} else {
  for (const file of cypressFiles) {
    map.merge(file);
  }
  console.log(
    `merge-coverage: merged ${cypressFiles.length} Cypress coverage artifact(s)`,
  );
}

const mergedPath = path.join(nycDir, "merged.json");
fs.writeFileSync(mergedPath, JSON.stringify(map.toJSON()));

const context = createContext({
  dir: outDir,
  coverageMap: map,
  defaultSummarizer: "nested",
});

for (const reporter of ["text", "text-summary", "lcov", "json"]) {
  reports.create(reporter, {}).execute(context);
}

console.log(`merge-coverage: wrote reports under ${outDir}`);
