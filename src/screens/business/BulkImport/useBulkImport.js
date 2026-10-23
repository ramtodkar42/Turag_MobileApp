import { useState } from 'react';
import { createIntakeImport } from '../../../api/services/business.api';
import { pickCsv } from '../../../utils/pickCsv';
import { tNow } from '../../../i18n';

// The web's bulk import form: a CSV file (read into text on the phone) and the
// lot's SARFAESI authority document key. submit() resolves to the finished
// import job, or null when a check or the upload failed (see `error`).
export default function useBulkImport(orgId) {
  const [file, setFile] = useState(null); // { fileName, fileSize, text }
  const [authorityKey, setAuthorityKey] = useState('');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const chooseFile = async () => {
    setPicking(true);
    setError('');
    try {
      const picked = await pickCsv();
      if (picked) {
        setFile(picked);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setPicking(false);
    }
  };

  const changeKey = value => {
    setAuthorityKey(value);
    setError('');
  };

  const submit = async () => {
    if (!file?.text?.trim()) {
      setError(tNow('business.import.error.noFile'));
      return null;
    }
    if (!authorityKey.trim()) {
      setError(tNow('business.import.error.noKey'));
      return null;
    }
    setBusy(true);
    setError('');
    try {
      return await createIntakeImport(orgId, { filename: file.fileName, csvContent: file.text, authorityKey });
    } catch (e) {
      setError(e.message || tNow('business.import.error.generic'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { file, authorityKey, changeKey, chooseFile, picking, busy, error, submit };
}
