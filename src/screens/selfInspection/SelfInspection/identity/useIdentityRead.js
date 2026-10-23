import { useCallback, useEffect, useRef, useState } from 'react';
import { launchImageLibrary } from 'react-native-image-picker';
import { extractInspectionIdentity } from '../../../../api/services/valuation.api';
import { tNow } from '../../../../i18n';

const PICK = {
  mediaType: 'photo',
  selectionLimit: 1,
  includeBase64: true,
  quality: 0.8,
  maxWidth: 1600,
  maxHeight: 1600,
};

// The VIN / RC photo read behind IdentityExtractCard. The photo is only read
// (as on the web) - it isn't uploaded as evidence.
//   phase: 'start' | 'reading' | 'ready'
//   read: what the AI read ({} for manual entry); fromPhoto: it came from a photo
//   notDocument: the photo isn't a VIN plate / an RC (manual review; retake or type)
//
// opts.initial restores this state when the step is reopened (so a read done
// earlier isn't lost when the wizard moves on and back); opts.onChange reports
// each settled transition up so the wizard can keep that draft. A read in
// flight ('reading') is transient and never restored.
export default function useIdentityRead(inspectionId, kind, { initial, onChange } = {}) {
  const [phase, setPhase] = useState(() => (initial?.phase === 'ready' ? 'ready' : 'start'));
  const [read, setRead] = useState(() => initial?.read ?? null);
  const [fromPhoto, setFromPhoto] = useState(() => initial?.fromPhoto ?? false);
  const [notDocument, setNotDocument] = useState(() => initial?.notDocument ?? false);
  const [error, setError] = useState('');
  const run = useRef(0);
  // Always call the latest onChange without re-creating the callbacks below.
  const report = useRef(onChange);
  report.current = onChange;
  const persist = next => report.current?.(next);

  useEffect(() => () => {
    run.current += 1; // drop a read that finishes after leaving the step
  }, []);

  const reset = useCallback(() => {
    run.current += 1;
    setPhase('start');
    setRead(null);
    setFromPhoto(false);
    setNotDocument(false);
    setError('');
    persist({ phase: 'start', read: null, fromPhoto: false, notDocument: false });
  }, []);

  const startManual = useCallback(() => {
    run.current += 1;
    setPhase('ready');
    setRead({});
    setFromPhoto(false);
    setNotDocument(false);
    setError('');
    persist({ phase: 'ready', read: {}, fromPhoto: false, notDocument: false });
  }, []);

  const choosePhoto = useCallback(async () => {
    const id = ++run.current;
    let image;
    try {
      const picked = await launchImageLibrary(PICK);
      if (picked.didCancel) {
        return;
      }
      image = picked.assets?.[0]?.base64;
      if (picked.errorCode || !image) {
        throw new Error('pick');
      }
    } catch {
      setError(tNow('inspector.identity.photoError'));
      return;
    }

    setPhase('reading');
    setError('');
    try {
      const result = await extractInspectionIdentity(inspectionId, kind, image);
      if (id !== run.current) {
        return;
      }
      const isDocument = kind === 'VIN' ? result?.isVinPlate : result?.isRcDocument;
      const nextRead = isDocument ? result : null;
      setNotDocument(!isDocument);
      setRead(nextRead);
      setFromPhoto(true);
      setPhase('ready');
      persist({ phase: 'ready', read: nextRead, fromPhoto: true, notDocument: !isDocument });
    } catch {
      if (id !== run.current) {
        return;
      }
      // Never a dead end: the details can still be typed.
      setError(tNow('inspector.identity.readError'));
      setRead({});
      setFromPhoto(false);
      setNotDocument(false);
      setPhase('ready');
      persist({ phase: 'ready', read: {}, fromPhoto: false, notDocument: false });
    }
  }, [inspectionId, kind]);

  return { phase, read, fromPhoto, notDocument, error, choosePhoto, startManual, reset };
}
