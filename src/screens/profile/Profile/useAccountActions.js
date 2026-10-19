import { useCallback } from 'react';
import { endSession } from '../../../api/session';
import { stopPush } from '../../../push/pushNotifications';
import { signOutLocally } from '../../../store/signOut';
import { ROUTES } from '../../../navigation/routes';
import { tNow } from '../../../i18n';

// Log out / delete account, each behind an app-styled confirmation dialog.
// `confirm` comes from useConfirmDialog() in the screen.
export default function useAccountActions(navigation, confirm) {
  // Instant: the server-side sign-out runs in the background.
  const signOut = useCallback(async () => {
    try {
      // While still signed in: stop pushes to this phone.
      await stopPush();
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

  // Deleting needs the backend; until then explain instead of doing nothing.
  const confirmDelete = useCallback(
    () =>
      confirm({
        title: tNow('profile.delete.title'),
        message: tNow('profile.delete.message'),
        confirmLabel: tNow('common.ok'),
        cancelLabel: tNow('common.cancel'),
      }),
    [confirm],
  );

  return { logout: confirmLogout, delete: confirmDelete };
}
