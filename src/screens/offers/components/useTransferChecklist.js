import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTransferChecklist,
  openTransferDocument,
  uploadTransferDocument,
} from '../../../api/services/transfer.api';
import { pickImageFromGallery, takePhoto } from '../../../utils/pickImage';
import { pickPdf } from '../../../utils/pickDocument';
import { tNow } from '../../../i18n';

// Let a bottom sheet finish closing before the camera / gallery / file picker opens.
const AFTER_SHEET_MS = 350;

const isProvided = status => status === 'PROVIDED' || status === 'VERIFIED' || status === 'WAIVED';

// The web's handover gate (shown only - the server checks again): Forms 29 and
// 30 provided, and the Form 35 NOC when it applies.
export const isHandoverReady = items => {
  const by = code => items.find(i => i.code === code);
  const f29 = by('FORM_29');
  const f30 = by('FORM_30');
  const f35 = by('FORM_35_NOC');
  if (!f29 || !f30 || !isProvided(f29.status) || !isProvided(f30.status)) return false;
  return !(f35 && f35.status !== 'NOT_APPLICABLE' && !isProvided(f35.status));
};

// One order's transfer checklist: load it, upload an item's document (camera /
// gallery / PDF) and open one. onReadyChange(ready) reports the handover gate.
// Returns { checklist, error, busyCode, openingCode, reload, upload(code, source), open(item) }.
export default function useTransferChecklist(orderId, onReadyChange) {
  const [checklist, setChecklist] = useState(null);
  const [error, setError] = useState('');
  const [busyCode, setBusyCode] = useState(null);
  const [openingCode, setOpeningCode] = useState(null);
  const readyRef = useRef(onReadyChange);
  readyRef.current = onReadyChange;
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const apply = useCallback(c => {
    if (!mounted.current) return;
    setChecklist(c);
    readyRef.current?.(isHandoverReady(c.items));
  }, []);

  const reload = useCallback(async () => {
    try {
      apply(await getTransferChecklist(orderId));
      if (mounted.current) setError('');
    } catch (e) {
      if (mounted.current) setError(e?.message || tNow('offers.transfer.loadError'));
    }
  }, [apply, orderId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // source: 'camera' | 'gallery' | 'pdf' (chosen in a sheet).
  const upload = (code, source) =>
    setTimeout(async () => {
      let file;
      try {
        file =
          source === 'pdf' ? await pickPdf() : source === 'camera' ? await takePhoto() : await pickImageFromGallery();
      } catch (e) {
        setError(e?.message === 'camera_permission' ? tNow('verify.error.camera') : tNow('offers.transfer.pickError'));
        return;
      }
      if (!file) return;
      setBusyCode(code);
      setError('');
      try {
        apply(await uploadTransferDocument(orderId, code, file));
      } catch (e) {
        if (mounted.current) setError(e?.message || tNow('offers.transfer.uploadError'));
      } finally {
        if (mounted.current) setBusyCode(null);
      }
    }, AFTER_SHEET_MS);

  const open = async item => {
    if (!item.document || openingCode) return;
    setOpeningCode(item.code);
    setError('');
    try {
      await openTransferDocument(orderId, item.code, item.document);
    } catch (e) {
      if (mounted.current) setError(e?.message || tNow('offers.transfer.downloadError'));
    } finally {
      if (mounted.current) setOpeningCode(null);
    }
  };

  return { checklist, error, busyCode, openingCode, reload, upload, open };
}
