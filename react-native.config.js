module.exports = {
  assets: ['./src/assets/fonts'],
  dependencies: {
    // Only the iPhone update popup reads the app's version with it (useAppStoreUpdate).
    'react-native-device-info': { platforms: { android: null } },
  },
};
