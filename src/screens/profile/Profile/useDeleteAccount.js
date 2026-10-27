import { useCallback, useState } from 'react';
import { deleteMyAccount } from '../../../api/services/profile.api';
import { endSession } from '../../../api/session';
import { stopPush } from '../../../push/pushNotifications';
import { signOutLocally } from '../../../store/signOut';
import { ROUTES } from '../../../navigation/routes';
import { tNow } from '../../../i18n';

// The word the user types to confirm (as the web: "Type DELETE to confirm").
export const CONFIRM_WORD = 'DELETE';

// Delete account (as the web's Account page): the confirmation sheet's state,
// and the deletion itself - then this phone is signed out and Login opens with
// "Your account has been deleted". The server already signed the user out on
// every device, so nothing more is sent to it.
// Returns { open, show(), hide(), typed, setTyped, canDelete, deleting, error, remove() }.
export default function useDeleteAccount(navigation) {
  const [open, setOpen] = useState(false);
  const [typed, setTypedText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const show = useCallback(() => {
    setTypedText('');
    setError('');
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    if (!deleting) setOpen(false);
  }, [deleting]);
  const setTyped = text => {
    setTypedText(text);
    if (error) setError('');
  };

  const canDelete = typed.trim() === CONFIRM_WORD && !deleting;

  const remove = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError('');
    try {
      await deleteMyAccount();
    } catch (e) {
      setError(e?.message || tNow('profile.delete.failed'));
      setDeleting(false);
      return;
    }
    // Deleted: forget everything on this phone.
    await stopPush().catch(() => {});
    await endSession().catch(() => {});
    signOutLocally();
    setOpen(false);
    (navigation.getParent() ?? navigation).reset({
      index: 0,
      routes: [{ name: ROUTES.LOGIN, params: { accountDeleted: true } }],
    });
  };

  return {
    open,
    show,
    hide,
    typed,
    setTyped,
    canDelete,
    deleting,
    error,
    remove,
  };
}
