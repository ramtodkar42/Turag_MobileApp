import { useCallback, useEffect, useRef, useState } from 'react';
import { createPayoutAccount, PAYOUT_PROOF_MAX_BYTES, uploadPayoutProof } from '../../../api/services/payout.api';
import { tNow } from '../../../i18n';
import { AFTER_SHEET_MS, pickProofFile } from './proofFile';

// Spaces and dashes people type inside an account number.
const cleanNumber = value => value.replace(/[\s-]/g, '');

// The "Add a bank account" form (as the web's AddAccountForm): checks the
// fields, saves the account, then uploads its proof. If the save worked but
// the upload did not, the list is refreshed and the seller is told to use
// "Upload proof" on the new account's card.
// onAdded(account?): reload the accounts (returns a promise); account: as the
// proof upload returned it (to show whether it was verified at once).
export default function useAddAccountForm(onAdded) {
  const [holder, setHolder] = useState('');
  const [bank, setBank] = useState('');
  const [ifsc, setIfscValue] = useState('');
  const [number, setNumber] = useState('');
  const [confirm, setConfirm] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  // IFSC is always upper case, as the web's field.
  const setIfsc = useCallback(value => setIfscValue(String(value).toUpperCase()), []);

  // source: 'camera' | 'gallery' | 'pdf' (chosen in the sheet).
  const chooseFile = useCallback(
    source =>
      setTimeout(async () => {
        try {
          const picked = await pickProofFile(source);
          if (picked && mounted.current) {
            setFile(picked);
            setError('');
          }
        } catch (e) {
          if (mounted.current) setError(e.message);
        }
      }, AFTER_SHEET_MS),
    [],
  );

  const submit = async () => {
    const digits = cleanNumber(number);
    const code = ifsc.trim().toUpperCase();
    const fail = key => setError(tNow(key));
    if (!holder.trim() || !bank.trim() || !code || !digits) return fail('payouts.form.fillAll');
    if (digits !== cleanNumber(confirm)) return fail('payouts.form.mismatch');
    // The contract's limits, checked here so the seller gets a plain message.
    if (code.length !== 11) return fail('payouts.form.ifscLength');
    if (digits.length < 9 || digits.length > 30) return fail('payouts.form.numberLength');
    if (!file) return fail('payouts.form.noProof');
    if ((file.fileSize ?? 0) > PAYOUT_PROOF_MAX_BYTES) return fail('payouts.form.tooLarge');

    setBusy(true);
    setError('');
    let created = null;
    try {
      created = await createPayoutAccount({
        holderName: holder.trim(),
        bankName: bank.trim(),
        ifsc: code,
        accountNumber: digits,
      });
      const uploaded = await uploadPayoutProof(created.id, file);
      if (mounted.current) {
        setHolder('');
        setBank('');
        setIfscValue('');
        setNumber('');
        setConfirm('');
        setFile(null);
      }
      await onAdded(uploaded);
    } catch (e) {
      // The account may already exist as a draft; refresh so the proof can be retried from its card.
      if (created) await onAdded();
      if (mounted.current) {
        setError(
          created
            ? tNow('payouts.form.proofFailed', { reason: e?.message || tNow('payouts.form.uploadFailed') })
            : e?.message || tNow('payouts.form.saveError'),
        );
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return {
    values: { holder, bank, ifsc, number, confirm },
    setters: { setHolder, setBank, setIfsc, setNumber, setConfirm },
    file,
    busy,
    error,
    chooseFile,
    submit,
  };
}
