import { execFileSync } from 'node:child_process';
import path from 'node:path';

export default async function globalTeardown() {
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
