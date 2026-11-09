import { useCallback, useEffect, useRef, useState } from 'react';
import { extractInspectionIdentity } from '../../../../api/services/valuation.api';
import { tNow } from '../../../../i18n';
import { takePhotoWithBase64 } from '../../../../utils/pickVideo';

// The VIN / RC photo read behind IdentityExtractCard. The photo is taken with the
// camera and read here; nothing is uploaded until the values are confirmed.
//   phase: 'start' | 'reading' | 'ready'
//   read: what the AI read ({} for manual entry); fromPhoto: it came from a photo
//   notDocument: the photo isn't a VIN plate / an RC (manual review; retake or type)
//   scanFile: the photo taken (no base64), kept even after a failed read, which is how
//   QC can tell a value was typed. Null when no photo was taken.
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
  const [scanFile, setScanFile] = useState(() => initial?.scanFile ?? null);
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
    setScanFile(null);
    setError('');
    persist({ phase: 'start', read: null, fromPhoto: false, notDocument: false, scanFile: null });
  }, []);

  const startManual = useCallback(() => {
    run.current += 1;
    setPhase('ready');
    setRead({});
    setFromPhoto(false);
    setNotDocument(false);
    setScanFile(null);
    setError('');
    persist({ phase: 'ready', read: {}, fromPhoto: false, notDocument: false, scanFile: null });
  }, []);

  const choosePhoto = useCallback(async () => {
    const id = ++run.current;
    let image;
    let file;
    try {
      const photo = await takePhotoWithBase64();
      if (!photo) {
        return; // cancelled
      }
      ({ base64: image, ...file } = photo);
      if (!image) {
        throw new Error('no photo');
      }
    } catch {
      setError(tNow('inspector.identity.photoError'));
      return;
    }

    setPhase('reading');
    setError('');
    setScanFile(file);
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
      persist({ phase: 'ready', read: nextRead, fromPhoto: true, notDocument: !isDocument, scanFile: file });
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
      persist({ phase: 'ready', read: {}, fromPhoto: false, notDocument: false, scanFile: file });
    }
  }, [inspectionId, kind]);

  return { phase, read, fromPhoto, notDocument, scanFile, error, choosePhoto, startManual, reset };
}
