import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { COVERAGE_ENABLED, coverageReport } from './coverage';
import { WIREMOCK_URL } from './env';

const COMPOSE = ['compose', '-f', 'docker-compose.integration.yml'];

export default async function globalSetup() {
    if (COVERAGE_ENABLED) coverageReport().cleanCache();
    // Reuse a WireMock that is already up (e.g. started by CI).
    if (await isUp()) return;
    execFileSync('docker', [...COMPOSE, 'up', '-d', '--wait'], {
        cwd: path.resolve(__dirname, '../../..'),
        stdio: 'inherit',
    });
}

async function isUp() {
    try {
        const res = await fetch(`${WIREMOCK_URL}/__admin/health`);
        return res.ok;
    } catch {
        return false;
    }
}
