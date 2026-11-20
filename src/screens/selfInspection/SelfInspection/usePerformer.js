import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../api/client';
import { getPerformer, savePerformer } from '../../../api/services/selfInspection.api';
import { takePhoto } from '../../../utils/pickImage';
import { tNow } from '../../../i18n';

// The server's limits (ADR-0104).
const NAME_MIN = 2;
export const PERFORMER_NAME_MAX = 100;
const SELFIE_MAX_BYTES = 10 * 1024 * 1024;

const clean = text => text.replace(/\s+/g, ' ').trim();

// A failed save in plain words.
const saveErrorText = e => {
  if (e?.status === 413) return tNow('selfInspection.performer.tooLarge');
  if (e?.code === 'PERFORMER_ATTESTATION_INVALID') return tNow('selfInspection.performer.needBoth');
  // No connection / timed out / server down: the client's own message says which.
  if (e instanceof ApiError && (e.isNetworkError || e.status >= 500) && e.message) return e.message;
  return tNow('selfInspection.performer.error');
};

// "Before you start" on a self-inspection (ADR-0104, as the web's
// PerformerAttestationCard): the person doing it takes a selfie and types their
// name. Only Turag's team reviewing the inspection sees it. Submit is refused
// until it's added, so `done` feeds the "what's left" list.
// enabled: the owner's own inspection (M1) that is still being filled in.
// Returns { status ('off' | 'loading' | 'unsupported' | 'ready' | 'error'), saved ({ name } | null),
//   done (true / false, null while loading or off), formOpen, editing, photo,
//   name, setName, takeSelfie(), startChange(), cancelChange(), save(), busy,
//   error, markMissing() }.
export default function usePerformer(inspectionId, enabled) {
  const [status, setStatus] = useState(enabled ? 'loading' : 'off');
  const [saved, setSaved] = useState(null);
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [name, setNameText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const picking = useRef(false);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return undefined;
    }
    let live = true;
    setStatus('loading');
    getPerformer(inspectionId)
      .then(record => {
        if (!live) return;
        setSaved(record);
        setStatus('ready');
      })
      .catch(e => {
        if (!live) return;
        // A server without this step yet (404): not asked; if it turns out to be
        // needed, the refused submit asks for it (markMissing).
        // Otherwise not known: ask for it (the server still decides at submit).
        setStatus(e?.status === 404 ? 'unsupported' : 'error');
      });
    return () => {
      live = false;
    };
  }, [inspectionId, enabled]);

  const setName = text => {
    setNameText(text);
    if (error) setError('');
  };

  // The front (selfie) camera. A second tap while it's opening is ignored.
  const takeSelfie = useCallback(async () => {
    if (picking.current || busy) return;
    picking.current = true;
    setError('');
    try {
      const file = await takePhoto({ front: true });
      if (!file || !mounted.current) return;
      if (file.fileSize > SELFIE_MAX_BYTES) {
        setError(tNow('selfInspection.performer.tooLarge'));
        return;
      }
      setPhoto(file);
    } catch (e) {
      if (mounted.current) {
        setError(e?.message === 'camera_permission' ? tNow('verify.error.camera') : tNow('profile.photo.pickError'));
      }
    } finally {
      picking.current = false;
    }
  }, [busy]);

  const startChange = () => {
    setNameText(saved?.name ?? '');
    setPhoto(null);
    setError('');
    setEditing(true);
  };

  const cancelChange = () => {
    if (busy) return;
    setEditing(false);
    setPhoto(null);
    setError('');
  };

  const save = async () => {
    if (busy) return;
    const trimmed = clean(name);
    if (!photo || trimmed.length < NAME_MIN) {
      setError(tNow('selfInspection.performer.needBoth'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const record = await savePerformer(inspectionId, { name: trimmed, file: photo });
      if (!mounted.current) return;
      setSaved(record ?? { name: trimmed });
      setStatus('ready');
      setEditing(false);
      setPhoto(null);
    } catch (e) {
      if (mounted.current) setError(saveErrorText(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  // Submit was refused for it (e.g. it couldn't be checked earlier): ask for it.
  const markMissing = useCallback(() => {
    setSaved(null);
    setEditing(false);
    setStatus(prev => (prev === 'off' ? prev : 'ready'));
  }, []);

  const asking = status === 'ready' || status === 'error';
  return {
    status,
    saved,
    done: asking ? !!saved : null,
    formOpen: asking && (!saved || editing),
    editing,
    photo,
    name,
    setName,
    takeSelfie,
    startChange,
    cancelChange,
    save,
    busy,
    error,
    markMissing,
  };
}
