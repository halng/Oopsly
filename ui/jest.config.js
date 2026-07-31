module.exports = {
  preset: 'jest-expo',
  
  // 1. Tell Jest to compile these specific packages (Standard Expo list)
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],

  // 2. Help Jest understand your alias "@/"
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/coverage/**',
    '!**/coverage-*/**',
    '!**/.nyc_output/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.config.js',
    '!**/eslint.config.js',
    '!**/metro.config.js',
    '!**/expo-env.d.ts',
    '!**/nativewind-env.d.ts',
    '!**/tailwind.config.js',
    // exclude for now, because these files are not in use yet
    '!**/hooks/**', 
    '!**/scripts/**',
    '!**/.expo/**',
    '!**/constants/**',
    '!**/components/**',
    '!**/app/subject/**',
    '!**/app/study/**',
    '!**/types/**',
    '!**/temp/**',
    // exclude screen components (not yet tested)
    '!**/screen/**',
    // exclude user-protected routes (not yet fully implemented)
    '!app/\\(user\\)/**',
    '!**/__mocks__/**',
    '!**/__tests__/**',
    '!**/cypress/**',
    '!**/cypress.config.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
