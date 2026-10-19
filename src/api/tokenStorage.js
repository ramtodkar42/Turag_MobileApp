import * as Keychain from 'react-native-keychain';

// Keeps the signed-in session on the device, encrypted by the OS
// (iOS Keychain / Android Keystore). One item, read once at app start:
//   { refreshToken, user, pending }
// `pending`: sign-up steps still to do ({ needsProfile, needsConsent }) or null.
// The short-lived access token is never stored; it lives in memory only.
const SERVICE = 'ai.turag.session';
const OPTIONS = {
  service: SERVICE,
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const loadSession = async () => {
  try {
    const item = await Keychain.getGenericPassword({ service: SERVICE });
    if (!item) {
      return null;
    }
    const saved = JSON.parse(item.password);
    return saved?.refreshToken ? saved : null;
  } catch {
    // Unreadable (e.g. restored to a new phone): start signed out.
    return null;
  }
};

export const saveSession = async session => {
  try {
    await Keychain.setGenericPassword('turag', JSON.stringify(session), OPTIONS);
  } catch {
    // Not fatal: the user stays signed in until the app is closed.
  }
};

export const clearSession = async () => {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // Nothing stored.
  }
};
