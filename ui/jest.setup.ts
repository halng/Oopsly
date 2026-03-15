import { jest } from '@jest/globals';

// ─── AsyncStorage (required by Zustand persist via store) ───────────────────
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// ─── React Native Gesture Handler ───────────────────────────────────────────
// Use targeted stubs instead of spreading requireActual('react-native') to avoid
// DevMenu TurboModule invariant on react-native/index.js
jest.mock('react-native-gesture-handler', () => {
  // Re-export TextInput from react-native since some screens use
  // `import { TextInput } from 'react-native-gesture-handler'`
  const { TextInput } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }: any) => children,
    Swipeable: ({ children }: any) => children,
    DrawerLayout: ({ children }: any) => children,
    State: {},
    NativeViewGestureHandler: ({ children }: any) => children,
    TapGestureHandler: ({ children }: any) => children,
    PanGestureHandler: ({ children }: any) => children,
    PinchGestureHandler: ({ children }: any) => children,
    RotationGestureHandler: ({ children }: any) => children,
    LongPressGestureHandler: ({ children }: any) => children,
    RawButton: ({ children }: any) => children,
    BaseButton: ({ children }: any) => children,
    RectButton: ({ children }: any) => children,
    BorderlessButton: ({ children }: any) => children,
    install: jest.fn(),
    Directions: {},
    Gesture: { Tap: jest.fn(), Pan: jest.fn(), Native: jest.fn() },
    TextInput,
  };
});

// ─── React Native Reanimated ─────────────────────────────────────────────────
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = jest.fn();
  return Reanimated;
});

// ─── Logger ──────────────────────────────────────────────────────────────────
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

afterEach(() => {
  jest.clearAllMocks();
});
