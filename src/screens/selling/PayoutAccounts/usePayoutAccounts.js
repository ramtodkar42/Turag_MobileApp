import { useCallback, useEffect, useRef, useState } from 'react';
import useRemoteData from '../../../hooks/useRemoteData';
import {
  activatePayoutAccount,
  listPayoutAccounts,
  openPayoutProof,
  uploadPayoutProof,
} from '../../../api/services/payout.api';
import { tNow } from '../../../i18n';
import { AFTER_SHEET_MS, pickProofFile } from './proofFile';

// The seller's payout accounts and the actions on each card (as the web's
// AccountCard): upload the proof of a DRAFT, make a verified one active, open
// the proof. Each card has its own busy state and error line.
// Returns { ...useRemoteData, busy: { [id]: 'upload'|'activate'|'proof' },
//   errors: { [id]: message }, uploadProof(account, source), activate(account), viewProof(account) }.
export default function usePayoutAccounts() {
  const remote = useRemoteData(listPayoutAccounts);
  const { reload } = remote;
  const [busy, setBusy] = useState({});
  const [errors, setErrors] = useState({});
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const setError = useCallback((id, message) => setErrors(e => ({ ...e, [id]: message })), []);

  // Runs one card's action; after a change the list reloads (statuses move on).
  const run = useCallback(
    async (account, kind, action, fallbackKey, { refresh = true } = {}) => {
      const id = account.id;
      setBusy(b => ({ ...b, [id]: kind }));
      setError(id, '');
      try {
        await action();
        if (refresh) await reload();
      } catch (e) {
        if (mounted.current) setError(id, e?.message || tNow(fallbackKey));
      } finally {
        if (mounted.current) {
          setBusy(b => {
            const next = { ...b };
            delete next[id];
            return next;
          });
        }
      }
    },
    [reload, setError],
  );

  // source: 'camera' | 'gallery' | 'pdf' (chosen in the sheet).
  const uploadProof = useCallback(
    (account, source) =>
      setTimeout(async () => {
        let file;
        try {
          file = await pickProofFile(source);
        } catch (e) {
          if (mounted.current) setError(account.id, e.message);
          return;
        }
        if (!file) return;
        run(account, 'upload', () => uploadPayoutProof(account.id, file), 'payouts.account.uploadError');
      }, AFTER_SHEET_MS),
    [run, setError],
  );

  const activate = useCallback(
    account => run(account, 'activate', () => activatePayoutAccount(account.id), 'payouts.account.activateError'),
    [run],
  );

  const viewProof = useCallback(
    account =>
      run(account, 'proof', () => openPayoutProof(account.id, account.proof), 'payouts.account.proofError', {
        refresh: false,
      }),
    [run],
  );

  return { ...remote, busy, errors, uploadProof, activate, viewProof };
}
