// Loads react-native-nitro-sound without crashing the app (same idea as
// utils/visionCamera.js). The JS part can load even when the app was built
// before the library was added, so we also ask Nitro whether the native
// "Sound" object really exists; if not, recording shows "not available".
export const loadSoundLibrary = (load, hasNative = () => true) => {
  try {
    const library = load();
    if (!library || typeof library.createSound !== 'function') {
      return null;
    }
    return hasNative() ? library : null;
  } catch {
    return null;
  }
};

const nativeSoundRegistered = () => {
  const { NitroModules } = require('react-native-nitro-modules');
  return NitroModules.hasHybridObject('Sound');
};

const soundLibrary = loadSoundLibrary(() => require('react-native-nitro-sound'), nativeSoundRegistered);

export const isAudioAvailable = soundLibrary !== null;

// New independent sound instance (recorder + player), or null if unavailable.
export const createSound = () => {
  if (!soundLibrary) {
    return null;
  }
  try {
    return soundLibrary.createSound();
  } catch {
    return null;
  }
};

// Recorder level in dB (-160..0) -> 0.15..1 for drawing bars.
export const meterToLevel = db => {
  if (typeof db !== 'number') {
    return 0.3;
  }
  return Math.min(1, Math.max(0.15, (db + 60) / 60));
};
