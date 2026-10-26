import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov'],
      // No threshold here: the 90% gate is on unit + integration combined,
      // see scripts/check-coverage.mjs (pnpm run coverage:check).
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'utils/**/*.{ts,tsx}', 'store/**/*.{ts,tsx}', 'services/**/*.{ts,tsx}', 'game/**/*.{ts,tsx}'],
      exclude: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/node_modules/**', '**/dist/**', '**/index.ts', '**/index.tsx', '**/types.ts', '**/types.tsx', '**/constants.ts', '**/constants.tsx'],
    },
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['__tests__/unit/**/*.test.{ts,tsx}'],
  },

})