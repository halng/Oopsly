// Merges the unit (vitest) and integration (Playwright) lcov reports and fails
// when combined line coverage is below the threshold.
//
//   node scripts/check-coverage.mjs            # gate at 90%
//   node scripts/check-coverage.mjs --top 25   # also list the 25 biggest gaps
//
// The unit run lists every in-scope file (see vitest `coverage.include`), so it
// defines the denominator. Integration records for files outside that scope are
// ignored; for files in scope a line counts as covered if either run hit it.
import fs from 'node:fs';

const THRESHOLD = Number(process.env.COVERAGE_THRESHOLD ?? 90);
const REPORTS = {
    unit: 'coverage/lcov.info',
    integration: 'coverage-integration/lcov.info',
};

function parse(file) {
    const files = new Map();
    if (!fs.existsSync(file)) return files;
    let lines = null;
    for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
        if (raw.startsWith('SF:')) {
            lines = new Map();
            files.set(raw.slice(3), lines);
        } else if (raw.startsWith('DA:') && lines) {
            const [n, hits] = raw.slice(3).split(',');
            lines.set(Number(n), Number(hits));
        }
    }
    return files;
}

const unit = parse(REPORTS.unit);
const integration = parse(REPORTS.integration);
if (unit.size === 0) {
    console.error(`No unit coverage in ${REPORTS.unit}. Run "pnpm run test:coverage" first.`);
    process.exit(2);
}
if (integration.size === 0) {
    console.warn(`No integration coverage in ${REPORTS.integration}; gating on unit tests alone.`);
}

const rows = [];
const total = { covered: 0, lines: 0, unit: 0, integration: 0 };
for (const [file, unitLines] of unit) {
    const intLines = integration.get(file) ?? new Map();
    const all = new Set([...unitLines.keys(), ...intLines.keys()]);
    let covered = 0;
    let byUnit = 0;
    let byIntegration = 0;
    for (const n of all) {
        const u = (unitLines.get(n) ?? 0) > 0;
        const i = (intLines.get(n) ?? 0) > 0;
        if (u || i) covered++;
        if (u) byUnit++;
        if (i) byIntegration++;
    }
    rows.push({ file, covered, lines: all.size, missing: all.size - covered });
    total.covered += covered;
    total.lines += all.size;
    total.unit += byUnit;
    total.integration += byIntegration;
}

const pct = (a, b) => (b === 0 ? 100 : (100 * a) / b);
const top = process.argv.includes('--top') ? Number(process.argv[process.argv.indexOf('--top') + 1] || 20) : 0;
if (top) {
    console.log('Biggest gaps (uncovered lines in the combined report):');
    for (const r of rows.sort((a, b) => b.missing - a.missing).slice(0, top)) {
        console.log(`  ${String(r.missing).padStart(4)}  ${pct(r.covered, r.lines).toFixed(0).padStart(3)}%  ${r.file}`);
    }
}

const combined = pct(total.covered, total.lines);
console.log(
    `\nLines  unit ${pct(total.unit, total.lines).toFixed(1)}%  integration ${pct(total.integration, total.lines).toFixed(1)}%  combined ${combined.toFixed(1)}% (${total.covered}/${total.lines}, ${unit.size} files)`
);
if (combined < THRESHOLD) {
    console.error(`FAIL: combined line coverage ${combined.toFixed(1)}% is below ${THRESHOLD}%`);
    process.exit(1);
}
console.log(`OK: combined line coverage is at least ${THRESHOLD}%`);
