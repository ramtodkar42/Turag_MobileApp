import { useCallback } from 'react';
import { endSession } from '../../../api/session';
import { stopPush } from '../../../push/pushNotifications';
import { signOutLocally } from '../../../store/signOut';
import { ROUTES } from '../../../navigation/routes';

// Log out never waits longer than this for the push sign-off (a slow network
// would otherwise make the tap look dead); by then its request is on its way.
const PUSH_STOP_WAIT_MS = 1500;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
import { tNow } from '../../../i18n';

// Log out (behind an app-styled confirmation dialog) and delete account (opens
// the "Type DELETE to confirm" sheet, see useDeleteAccount).
// `confirm` comes from useConfirmDialog() in the screen; onDelete opens the sheet.
export default function useAccountActions(navigation, confirm, onDelete) {
  // Instant: the server-side sign-out runs in the background.
  const signOut = useCallback(async () => {
    try {
      // While still signed in: stop pushes to this phone.
      await Promise.race([stopPush(), wait(PUSH_STOP_WAIT_MS)]);
      await endSession({ remote: true });
    } finally {
      signOutLocally();
      // Reset the whole app (root stack), not just the tabs.
      (navigation.getParent() ?? navigation).reset({
        index: 0,
        routes: [{ name: ROUTES.LOGIN }],
      });
    }
  }, [navigation]);

  const confirmLogout = useCallback(
    () =>
      confirm({
        title: tNow('profile.logout.title'),
        message: tNow('profile.logout.message'),
        confirmLabel: tNow('profile.logout.confirm'),
        onConfirm: signOut,
      }),
    [confirm, signOut],
  );

  return { logout: confirmLogout, delete: onDelete };
}
