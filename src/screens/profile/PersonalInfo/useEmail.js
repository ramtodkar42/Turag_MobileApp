import { useState } from 'react';
import { saveMyEmail } from '../../../api/services/profile.api';
import { updateSession } from '../../../api/session';
import { getUser, setUser } from '../../../store/userStore';
import { isEmail } from '../../../utils/validators';
import { tNow } from '../../../i18n';

// A failed send, in plain words (as the web's Account page).
const errorText = e => {
  switch (e?.code) {
    case 'EMAIL_IN_USE':
      return tNow('auth.create.emailInUse');
    case 'EMAIL_DELIVERY_UNAVAILABLE':
      return tNow('profile.email.deliveryDown');
    case 'VALIDATION_ERROR':
      return tNow('errors.email');
    default:
      return e?.message || tNow('profile.email.sendError');
  }
};

// The account's email in Personal Information (as the web's Account page):
// resend the verification link, or add / change the email (saved unverified;
// a link is emailed to confirm it). The status itself comes from the account
// (Personal Information reloads when it comes back into view, e.g. after the
// user tapped the link). onSaved(email): the page updates its email to that,
// unverified.
// Returns { busy ('resend' | 'save' | null), notice, error, editing, draft,
//   setDraft, startEdit(), cancelEdit(), resend(email), save() }.
export default function useEmail({ email, onSaved }) {
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const send = async (kind, address) => {
    setBusy(kind);
    setError('');
    setNotice('');
    try {
      await saveMyEmail(address);
      setNotice(tNow('profile.email.sent', { email: address }));
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const resend = () => email && !busy && send('resend', email);

  const startEdit = () => {
    setDraft(email ?? '');
    setError('');
    setNotice('');
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const save = async () => {
    const address = draft.trim();
    if (busy) return;
    if (!isEmail(address)) {
      setError(tNow('errors.email'));
      return;
    }
    if (await send('save', address)) {
      setEditing(false);
      // The account now has this email, unverified (as the server stored it).
      const user = { ...getUser(), email: address, emailVerified: false };
      setUser(user);
      updateSession({ user }).catch(() => {});
      onSaved?.(address);
    }
  };

  const setDraftText = text => {
    setDraft(text);
    if (error) setError('');
  };

  return { busy, notice, error, editing, draft, setDraft: setDraftText, startEdit, cancelEdit, resend, save };
}
