// Loads react-native-vision-camera without crashing the app.
// If the installed app was built before the camera library was added (native
// part missing), the import fails or comes back empty; screens then show a
// "camera not available" message instead of a red error screen.

// Returns the library when it's usable, otherwise null.
export const loadCameraLibrary = load => {
  try {
    const library = load();
    return library && typeof library.useCameraPermission === 'function' ? library : null;
  } catch {
    return null;
  }
};

export const visionCamera = loadCameraLibrary(() => require('react-native-vision-camera'));
export const isCameraAvailable = visionCamera !== null;
