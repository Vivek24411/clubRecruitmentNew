jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  const animation = { duration: () => animation, easing: () => animation, reduceMotion: () => animation };
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { out: (value) => value, cubic: 'cubic' },
    FadeIn: animation,
    FadeInDown: animation,
    ReduceMotion: { System: 'system' },
    useAnimatedStyle: (factory) => factory(),
    useSharedValue: (initial) => ({ value: initial, set(value) { this.value = value; } }),
    withSpring: (value) => value,
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
