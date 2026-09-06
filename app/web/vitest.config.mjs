import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
 
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov'],
      threshold: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'utils/**/*.{ts,tsx}', 'store/**/*.{ts,tsx}'],
      exclude: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/node_modules/**', '**/dist/**', '**/index.ts', '**/index.tsx', '**/types.ts', '**/types.tsx', '**/constants.ts', '**/constants.tsx'],
    },
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['__tests__/unit/**/*.test.{ts,tsx}'],
  },

})