import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { getAppStoreRelease } from '../api/services/appStore.api';
import { claimUpdatePrompt } from '../utils/appPrefs';
import { isNewerVersion } from '../utils/version';

// iPhone (Apple has no in-app update): on app open, compares the installed version with
// the App Store's. open = true when there's a newer one this iPhone can install, at most
// once a day. Any failure (no internet, not listed yet) is simply no prompt.
export default function useAppStoreUpdate() {
  const [url, setUrl] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Loaded here: the library is linked on iOS only (react-native.config.js).
        const { getBundleId, getVersion } = require('react-native-device-info');
        const release = await getAppStoreRelease(getBundleId());
        if (cancelled || !release || !isNewerVersion(release.version, getVersion())) return;
        const os = Platform.Version; // not known: assume it can install it
        if (os && release.minimumOsVersion && isNewerVersion(release.minimumOsVersion, os)) return;
        if (!(await claimUpdatePrompt()) || cancelled) return;
        setUrl(release.url);
        setOpen(true);
      } catch {
        // No prompt this time; nothing else depends on it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => setOpen(false), []);
  const update = useCallback(() => {
    setOpen(false);
    Linking.openURL(url).catch(() => {});
  }, [url]);

  return { open, dismiss, update };
}
