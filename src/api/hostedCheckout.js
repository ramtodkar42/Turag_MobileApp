import { Linking } from 'react-native';

// The secure browser tab is a native module: loaded on first use, so a build
// without it falls back to the phone's browser.
let InAppBrowser = null;
try {
  InAppBrowser = require('react-native-inappbrowser-reborn').InAppBrowser;
} catch {
  InAppBrowser = null;
}

// A payment gateway's own page (PhonePe: the server's `redirect_url`, as the
// web sends the browser there), opened in a secure browser tab over the app -
// Chrome Custom Tabs / Safari - where the payer picks UPI, card or net banking.
// Resolves when they close the tab (the payment itself is confirmed by the
// server's webhook; the caller then checks). Without the tab, the phone's
// browser opens and this resolves at once.
export const openHostedCheckout = async url => {
  try {
    if (InAppBrowser && (await InAppBrowser.isAvailable())) {
      await InAppBrowser.open(url, {
        showTitle: true,
        enableUrlBarHiding: true,
        enableDefaultShare: false,
        showInRecents: false,
        toolbarColor: '#E82127',
        ephemeralWebSession: false,
      });
      return;
    }
  } catch {
    // fall back to the browser
  }
  await Linking.openURL(url).catch(() => {});
};
