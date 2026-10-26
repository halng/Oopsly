import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { COVERAGE_ENABLED, coverageOptions, coverageReport } from './coverage';

export default async function globalTeardown() {
    if (COVERAGE_ENABLED) {
        await coverageReport().generate();
        dropUnmappedRecords();
    }
    if (process.env.KEEP_WIREMOCK) return;
    execFileSync(
        'docker',
        ['compose', '-f', 'docker-compose.integration.yml', 'down'],
        {
            cwd: path.resolve(__dirname, '../../..'),
            stdio: 'inherit',
        }
    );
}

/** Bundles without a source map end up as records for files that do not exist. */
function dropUnmappedRecords() {
    const root = path.resolve(__dirname, '../../..');
    const file = path.join(
        root,
        coverageOptions.outputDir ?? 'coverage-integration',
        'lcov.info'
    );
    if (!fs.existsSync(file)) return;
    const kept = fs
        .readFileSync(file, 'utf8')
        .split('end_of_record\n')
        .filter((record) => {
            const source = /^SF:(.*)$/m.exec(record)?.[1];
            return source && fs.existsSync(path.join(root, source));
        });
    fs.writeFileSync(
        file,
        kept.map((record) => `${record}end_of_record\n`).join('')
    );
}
