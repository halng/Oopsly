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
  
  // 3. Temporarily ignore tests for components not yet implemented
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/components/deck/', // Deck components not yet implemented
  ],
  
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/coverage/**',
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
    '!**/app/\\(user\\)/**',
    '!**/types/**',
    // exclude test files from coverage
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};