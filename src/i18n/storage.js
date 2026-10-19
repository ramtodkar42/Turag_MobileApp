import * as Keychain from 'react-native-keychain';

// Remembers the chosen app language on the device (react-native-keychain is
// already in the app, so no extra native library is needed). Not secret.
const SERVICE = 'ai.turag.prefs.language';

export const loadLanguage = async () => {
  try {
    const item = await Keychain.getGenericPassword({ service: SERVICE });
    return item ? item.password : null;
  } catch {
    return null;
  }
};

export const saveLanguage = async language => {
  try {
    await Keychain.setGenericPassword('language', language, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch {
    // Not fatal: the language still applies until the app is closed.
  }
};
