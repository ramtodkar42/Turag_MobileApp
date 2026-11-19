import { useCallback, useEffect, useState } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';

// Android only (InAppUpdateModule): on iOS, and in builds without it, this does nothing.
const Updater = NativeModules.InAppUpdate;
const emitter = Updater ? new NativeEventEmitter(Updater) : null;

// On app open, Google Play's in-app update: its own prompt every time the app opens
// while a newer version is out (until the user updates), then ready = true once it has
// downloaded, so the app can offer to restart. A failure (e.g. not installed from Play)
// is simply no prompt.
export default function useInAppUpdate() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!Updater) return undefined;
    let cancelled = false;
    const subscription = emitter.addListener('InAppUpdate_downloaded', () => setReady(true));
    (async () => {
      try {
        const { available, downloaded } = await Updater.check();
        if (cancelled) return;
        if (downloaded) {
          setReady(true);
          return;
        }
        if (!available || cancelled) return;
        await Updater.start();
      } catch {
        // No prompt this time; nothing else depends on it.
      }
    })();
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const dismiss = useCallback(() => setReady(false), []);
  const install = useCallback(() => Updater?.install(), []);

  return { ready, dismiss, install };
}
