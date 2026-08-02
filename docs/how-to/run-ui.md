# How to run the UI

## Install and start

```bash
cd ui
pnpm install
pnpm start
```

`pnpm start` runs `expo start -c` (clears Metro cache).

## Targets

| Command | Target |
| ------- | ------ |
| `pnpm start` then `w` | Web |
| `pnpm android` | Android |
| `pnpm ios` | iOS (macOS + Xcode) |
| `pnpm web` | Web directly |

## Backend URL

Set in `ui/.env`:

```env
EXPO_PUBLIC_BACKEND_API=http://localhost:9009
```

The Axios client appends `api/v1/oopsly` (see `ui/services/index.ts`).

For a physical device, use your machine’s LAN IP instead of `localhost`.

## Quality checks

```bash
pnpm lint
pnpm test
pnpm test:coverage
```
