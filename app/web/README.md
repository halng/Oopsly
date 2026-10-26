This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Integration tests (Playwright + WireMock)

Every screen is driven in a real browser against the real Next.js app, while
WireMock answers for the api, auth and game services.

```bash
pnpm exec playwright install chromium   # first time only
pnpm test:integration                   # starts WireMock via docker compose, runs, stops it
KEEP_WIREMOCK=1 pnpm test:integration   # leave WireMock up between runs
```

- Specs: `__tests__/integration/specs/<screen>.spec.ts`, one file per screen.
- Default happy-path stubs for every endpoint: `__tests__/integration/support/data.ts`.
- A test overrides one endpoint with `mock.override({...})` and asserts what the
  UI sent with `mock.requests(method, path)`.
- A request no stub answers fails the test (`requests without a WireMock stub`).
- The garden WebSocket is faked in the browser, as WireMock speaks HTTP only.
- `test.fail()` marks a known app bug; it turns red when the bug is fixed.

### Coverage gate (90%)

```bash
pnpm run test:coverage                 # unit tests  -> coverage/lcov.info
COVERAGE=1 pnpm run test:integration   # browser run -> coverage-integration/lcov.info
pnpm run coverage:check                # merge both; fails under 90% combined lines
```

A line counts as covered when either run hits it. The files measured are set by
`coverage.include` in `vitest.config.mjs` (app, components, hooks, utils, store,
services, game). CI runs the same three steps; Sonar reads both lcov files.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Inside that directory, you can run several commands:

pnpm exec playwright test
Runs the end-to-end tests.

pnpm exec playwright test --ui
Starts the interactive UI mode.

pnpm exec playwright test --project=chromium
Runs the tests only on Desktop Chrome.

pnpm exec playwright test example
Runs the tests in a specific file.

pnpm exec playwright test --debug
Runs the tests in debug mode.

pnpm exec playwright codegen
Auto generate tests with Codegen.

We suggest that you begin by typing:

    pnpm exec playwright test
