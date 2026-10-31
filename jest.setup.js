// Native modules that don't exist in the Jest environment.
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
  launchCamera: jest.fn(() => Promise.resolve({ didCancel: true })),
}));

jest.mock('@react-native-clipboard/clipboard', () =>
  require('@react-native-clipboard/clipboard/jest/clipboard-mock'),
);

// Native camera (react-native-vision-camera v5): render nothing, report no device.
jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  CommonResolutions: { FHD_4_3: { width: 1440, height: 1920 } },
  useCameraDevice: jest.fn(() => undefined),
  useCameraPermission: jest.fn(() => ({
    status: 'authorized',
    hasPermission: true,
    canRequestPermission: false,
    requestPermission: jest.fn(() => Promise.resolve(true)),
  })),
  usePhotoOutput: jest.fn(() => ({
    capturePhotoToFile: jest.fn(() => Promise.resolve({ filePath: '/tmp/photo.jpg' })),
  })),
}));

// Audio recorder (react-native-nitro-sound): a fake sound instance.
jest.mock('react-native-nitro-sound', () => {
  const make = () => {
    let recordListener = null;
    let endListener = null;
    return {
      startRecorder: jest.fn(() => Promise.resolve('file:///tmp/note.m4a')),
      stopRecorder: jest.fn(() => Promise.resolve('file:///tmp/note.m4a')),
      startPlayer: jest.fn(() => Promise.resolve('file:///tmp/note.m4a')),
      pausePlayer: jest.fn(() => Promise.resolve('')),
      resumePlayer: jest.fn(() => Promise.resolve('')),
      stopPlayer: jest.fn(() => Promise.resolve('')),
      addRecordBackListener: jest.fn(cb => {
        recordListener = cb;
      }),
      removeRecordBackListener: jest.fn(),
      addPlayBackListener: jest.fn(),
      removePlayBackListener: jest.fn(),
      addPlaybackEndListener: jest.fn(cb => {
        endListener = cb;
      }),
      removePlaybackEndListener: jest.fn(),
      // Test helpers
      __emitRecord: e => recordListener?.(e),
      __emitEnd: () => endListener?.({}),
    };
  };
  return { createSound: jest.fn(make) };
});

// Maps (react-native-maps): plain views so screens render in tests.
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  const MapView = props => <View {...props} />;
  return {
    __esModule: true,
    default: MapView,
    MapView,
    Marker: props => <View {...props} />,
    Polyline: () => null,
  };
});

// Nitro core: report native objects as registered (their libraries are mocked above).
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: { hasHybridObject: jest.fn(() => true) },
}));

// Secure storage (react-native-keychain): an in-memory keychain.
jest.mock('react-native-keychain', () => {
  const items = new Map();
  return {
    ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly' },
    setGenericPassword: jest.fn((username, password, { service } = {}) => {
      items.set(service, { username, password, service });
      return Promise.resolve({ service });
    }),
    getGenericPassword: jest.fn(({ service } = {}) => Promise.resolve(items.get(service) ?? false)),
    resetGenericPassword: jest.fn(({ service } = {}) => Promise.resolve(items.delete(service))),
  };
});

// Phone location (@react-native-community/geolocation): Baner, Pune by default.
jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    setRNConfiguration: jest.fn(),
    requestAuthorization: jest.fn(),
    getCurrentPosition: jest.fn(success =>
      success({ coords: { latitude: 18.559, longitude: 73.7868, accuracy: 10 }, timestamp: Date.now() }),
    ),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
}));

// Web view (react-native-webview: the booking map, the support chat): a plain
// view; tests send its messages through the onMessage prop, and what the app
// runs inside it lands on WebView.injectJavaScript (a jest.fn).
jest.mock('react-native-webview', () => {
  const { forwardRef, useImperativeHandle } = require('react');
  const { View } = require('react-native');
  const injectJavaScript = jest.fn();
  const WebView = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({ injectJavaScript }));
    return <View {...props} />;
  });
  WebView.injectJavaScript = injectJavaScript;
  return { __esModule: true, default: WebView, WebView };
});

// Secure browser tab (react-native-inappbrowser-reborn: Google sign-in, PhonePe):
// available, and closed by the user straight away unless a test says otherwise.
jest.mock('react-native-inappbrowser-reborn', () => {
  const InAppBrowser = {
    isAvailable: jest.fn(() => Promise.resolve(true)),
    open: jest.fn(() => Promise.resolve({ type: 'cancel' })),
    openAuth: jest.fn(() => Promise.resolve({ type: 'cancel' })),
    close: jest.fn(),
    closeAuth: jest.fn(),
  };
  return { __esModule: true, default: InAppBrowser, InAppBrowser };
});

// Splash screen (native): nothing to hide in tests.
jest.mock('react-native-bootsplash', () => {
  const BootSplash = {
    hide: jest.fn(() => Promise.resolve()),
    isVisible: jest.fn(() => Promise.resolve(false)),
    useHideAnimation: jest.fn(() => ({ container: {}, logo: {}, brand: {} })),
  };
  return { __esModule: true, default: BootSplash, ...BootSplash };
});

// FastImage (native, ships TypeScript source): a plain Image in tests.
jest.mock('@d11/react-native-fast-image', () => {
  const { Image } = require('react-native');
  const FastImage = props => require('react').createElement(Image, props);
  FastImage.priority = { low: 'low', normal: 'normal', high: 'high' };
  FastImage.resizeMode = { contain: 'contain', cover: 'cover', stretch: 'stretch', center: 'center' };
  FastImage.cacheControl = { immutable: 'immutable', web: 'web', cacheOnly: 'cacheOnly' };
  FastImage.preload = jest.fn();
  FastImage.clearMemoryCache = jest.fn(() => Promise.resolve());
  FastImage.clearDiskCache = jest.fn(() => Promise.resolve());
  return { __esModule: true, default: FastImage };
});

// File picker (@react-native-documents/picker): picks one PDF, copied to the cache.
jest.mock('@react-native-documents/picker', () => ({
  types: { pdf: 'application/pdf' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: error => !!error?.code,
  pick: jest.fn(() =>
    Promise.resolve([{ uri: 'content://mock/policy.pdf', name: 'policy.pdf', type: 'application/pdf', size: 120000 }]),
  ),
  keepLocalCopy: jest.fn(({ files }) =>
    Promise.resolve(files.map(f => ({ status: 'success', sourceUri: f.uri, localUri: `file:///cache/${f.fileName}` }))),
  ),
  // "Save to..." (Downloads / Drive / Files): saved where the user picked.
  saveDocuments: jest.fn(({ fileName }) =>
    Promise.resolve([{ uri: `content://downloads/${fileName}`, name: fileName, error: null }]),
  ),
}));

// HTML -> PDF (react-native-html-to-pdf, the booking receipt).
jest.mock('react-native-html-to-pdf', () => ({
  generatePDF: jest.fn(({ fileName }) => Promise.resolve({ filePath: `/data/cache/${fileName}.pdf` })),
}));

// Push (Firebase Cloud Messaging): a phone with permission and a fixed token;
// tests can fire a push with __emit(event, message).
jest.mock('@react-native-firebase/messaging', () => {
  const handlers = {};
  const on = event =>
    jest.fn((messaging, listener) => {
      handlers[event] = listener;
      return () => delete handlers[event];
    });
  return {
    AuthorizationStatus: { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
    getMessaging: jest.fn(() => ({})),
    getToken: jest.fn(() => Promise.resolve('fcm-test-token')),
    deleteToken: jest.fn(() => Promise.resolve()),
    hasPermission: jest.fn(() => Promise.resolve(1)),
    requestPermission: jest.fn(() => Promise.resolve(1)),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    setBackgroundMessageHandler: jest.fn(),
    onMessage: on('message'),
    onTokenRefresh: on('tokenRefresh'),
    onNotificationOpenedApp: on('opened'),
    __emit: (event, value) => handlers[event]?.(value),
  };
});

// Network status (@react-native-community/netinfo): the library's mock, always
// online. Without it the store falls back to request-outcome reports, so one
// simulated network error would leave every later request in the file offline.
jest.mock('@react-native-community/netinfo', () => {
  const NetInfo = require('@react-native-community/netinfo/jest/netinfo-mock');
  return { __esModule: true, default: NetInfo, ...NetInfo };
});

// App settings (async-storage v3): the library's in-memory storage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// Screens use the mock API in tests; client/session tests switch to the real one.
{
  const { USE_REAL_API } = require('./src/api/config');
  Object.keys(USE_REAL_API).forEach(key => {
    USE_REAL_API[key] = false;
  });
}
