import { useEffect, useRef, useState } from 'react';
import { updateMyName } from '../../../api/services/profile.api';
import { updateSession } from '../../../api/session';
import { getUser, setUser } from '../../../store/userStore';
import { tNow } from '../../../i18n';

// The longest name the server takes.
export const NAME_MAX = 80;

// One human label: inner spaces collapsed, ends trimmed (as the server does).
const clean = text => text.replace(/\s+/g, ' ').trim();

// Change the account's name (as the web's Account page): a sheet with the name,
// saved on the account so it shows on every phone and on the web.
// Returns { open, start(), close(), draft, setDraft, error, saving, save() }.
export default function useName() {
  const [open, setOpen] = useState(false);
  const [draft, setDraftText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const start = () => {
    setDraftText(getUser()?.fullName ?? '');
    setError('');
    setOpen(true);
  };

  const close = () => {
    if (!saving) {
      setOpen(false);
    }
  };

  const setDraft = text => {
    setDraftText(text);
    if (error) setError('');
  };

  const save = async () => {
    if (saving) return;
    const name = clean(draft);
    // The same rule as Create Account.
    if (name.length < 2) {
      setError(tNow('errors.fullName'));
      return;
    }
    const current = getUser();
    if (name === current?.fullName) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateMyName(name, { phone: current?.contact });
      // Keep what only the phone knows (e.g. the typed number), take the new name.
      const merged = { ...current, ...updated, contact: current?.contact ?? updated.contact };
      setUser(merged);
      updateSession({ user: merged }).catch(() => {});
      if (mounted.current) setOpen(false);
    } catch (e) {
      if (mounted.current) {
        setError(e?.code === 'VALIDATION_ERROR' ? tNow('errors.fullName') : e?.message || tNow('profile.name.saveError'));
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  return { open, start, close, draft, setDraft, error, saving, save };
}
