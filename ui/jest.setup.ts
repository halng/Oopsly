import { jest } from '@jest/globals';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Provide a lightweight logger mock to silence async console noise in tests
jest.mock('react-native-logs', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    extend: jest.fn(),
  };

  mockLogger.extend.mockImplementation(() => mockLogger);

  return {
    __esModule: true,
    logger: {
      createLogger: jest.fn(() => mockLogger),
    },
    consoleTransport: jest.fn(),
  };
});

// Some components rely on alert being available in the environment
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.alert = global.alert || jest.fn();
});

beforeEach(() => {
  // Ensure each test starts on real timers (verification specs use fake timers).
  jest.useRealTimers();
});

afterEach(() => {
  jest.clearAllMocks();
  // Prevent fake-timer leakage (e.g. from verification tests) from hanging waitFor.
  jest.useRealTimers();
});
