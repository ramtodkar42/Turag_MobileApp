module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // Tests that mount the full app navigator can exceed 5s when files run in parallel.
  testTimeout: 20000,
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community|-async-storage)?|@react-navigation|react-native-calendars|react-native-swipe-gestures)/)',
  ],
};
