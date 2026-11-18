import { useEffect } from 'react';
import { AppState } from 'react-native';
import { PLAY_BILLING } from '../api/config';
import { onPlayPurchasesUpdated } from '../api/playBilling';
import { recoverPlayPurchases } from '../api/services/selfInspection.api';

// Android, signed in: an AI Self Inspection fee bought with Google Play but not yet
// recorded by Turag is sent to the server. This happens when the app closed right after
// paying, or when a pending payment (e.g. cash at a shop) went through later. Checked
// when the app opens, when it comes back to the front (Google's advice), and when Google
// reports a purchase change. Nothing is ever bought here. A purchase that is never
// recorded is refunded by Google after 3 days.
export default function usePlayPurchaseRecovery(signedIn) {
  useEffect(() => {
    if (!signedIn || !PLAY_BILLING.enabled) {
      return undefined;
    }
    recoverPlayPurchases();
    const stopWatching = onPlayPurchasesUpdated(() => recoverPlayPurchases());
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') {
        recoverPlayPurchases();
      }
    });
    return () => {
      stopWatching();
      appState.remove();
    };
  }, [signedIn]);
}
