// Copies text to the phone clipboard. Returns true on success.
// The library is loaded only when needed: it throws on import if its native
// part isn't in the installed app yet (app not rebuilt), and a top-level import
// would then break every screen that imports this file.
export const copyToClipboard = text => {
  try {
    const module = require('@react-native-clipboard/clipboard');
    const Clipboard = module.default ?? module;
    Clipboard.setString(text);
    return true;
  } catch {
    return false;
  }
};
