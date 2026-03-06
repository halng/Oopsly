import { jest } from '@jest/globals';

// Provide a lightweight logger mock to silence async console noise in tests
const sharedLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  extend: jest.fn(),
};

sharedLogger.extend.mockImplementation(() => sharedLogger);

jest.mock('react-native-logs', () => ({
  __esModule: true,
  logger: {
    createLogger: jest.fn(() => sharedLogger),
  },
  consoleTransport: jest.fn(),
}));

// Some components rely on alert being available in the environment
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.alert = global.alert || jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});
