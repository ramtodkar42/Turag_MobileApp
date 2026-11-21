import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../api/client';
import { getPerformer, savePerformer } from '../../../api/services/selfInspection.api';
import { takePhoto } from '../../../utils/pickImage';
import { tNow } from '../../../i18n';

// The server's limits (ADR-0104).
const NAME_MIN = 2;
export const PERFORMER_NAME_MAX = 100;
const SELFIE_MAX_BYTES = 10 * 1024 * 1024;

// How long the page waits for this record while it opens; later, the card reads it itself.
const PERFORMER_WAIT_MS = 4000;

const clean = text => text.replace(/\s+/g, ' ').trim();

// The selfie + name record, read alongside the inspection so its card is in place
// the moment the page opens (no card popping in and pushing the page down).
// Resolves { ok: true, record } | { ok: false, error } | null (no answer in time).
export const readPerformer = inspectionId =>
  new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), PERFORMER_WAIT_MS);
    // Never fails the page: any problem becomes an answer the card can show.
    Promise.resolve()
      .then(() => getPerformer(inspectionId))
      .then(
      record => {
        clearTimeout(timer);
        resolve({ ok: true, record });
      },
      error => {
        clearTimeout(timer);
        resolve({ ok: false, error });
      },
    );
  });

// A read's answer -> the card's state. A server without this step yet (404) isn't
// asked; if it turns out to be needed, the refused submit asks for it (markMissing).
// Anything else unknown: ask for it (the server still decides at submit).
const statusOf = read => {
  if (read.ok) return 'ready';
  return read.error?.status === 404 ? 'unsupported' : 'error';
};

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
// prefetched: readPerformer()'s answer from the page load (undefined while the
//   page loads; null when it didn't answer in time - then it's read here).
// Returns { status ('off' | 'loading' | 'unsupported' | 'ready' | 'error'), saved ({ name } | null),
//   done (true / false, null while loading or off), formOpen, editing, photo,
//   name, setName, takeSelfie(), startChange(), cancelChange(), save(), busy,
//   error, markMissing() }.
export default function usePerformer(inspectionId, enabled, prefetched) {
  // A late read (prefetched null): its answer.
  const [lateRead, setLateRead] = useState(null);
  // What happened here since the page loaded (a save, a refused submit), for this load only.
  const [local, setLocal] = useState({ source: undefined, saved: undefined, forced: false });
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

  // The page load didn't get an answer in time: read it now.
  useEffect(() => {
    if (!enabled || prefetched !== null) return undefined;
    let live = true;
    readPerformer(inspectionId).then(read => live && setLateRead(read ?? { ok: false, error: null }));
    return () => {
      live = false;
    };
  }, [inspectionId, enabled, prefetched]);

  const read = prefetched ?? (prefetched === null ? lateRead : null);
  const mine = local.source === prefetched ? local : { source: prefetched, saved: undefined, forced: false };

  let status = 'off';
  if (enabled) {
    if (!read) status = 'loading';
    else status = mine.forced ? 'ready' : statusOf(read);
  }
  const saved = mine.saved !== undefined ? mine.saved : read?.ok ? read.record : null;

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
      setLocal({ source: prefetched, saved: record ?? { name: trimmed }, forced: true });
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
    setLocal({ source: prefetched, saved: null, forced: true });
    setEditing(false);
  }, [prefetched]);

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
