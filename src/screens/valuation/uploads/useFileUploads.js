import { useCallback, useRef, useState } from 'react';
import { pickImageFromGallery } from '../../../utils/pickImage';
import { pickPdf } from '../../../utils/pickDocument';
import { tNow } from '../../../i18n';

const isPdf = file => String(file?.type ?? '').toLowerCase().includes('pdf');

// Upload state per item key: { uploading, uploaded, fileSize, preview, isPdf, error }.
// `uploadFn(key, file)` sends one file and returns { mediaId }; `maxMb`
// (a number, or file => number) rejects bigger files. Documents come from the
// gallery (uploadFromGallery) or as a PDF (uploadFromFiles); photos come from
// the in-app camera (uploadFile).
//
// Uploading again for a key REPLACES its file: the new one is uploaded first
// and only then are the old ones deleted with `removeFn(mediaId)`, so a failed
// replacement keeps the current file. `existingIds(key)` gives the ids already
// on the backend from an earlier visit (inspector resume).
export default function useFileUploads({ uploadFn, removeFn, existingIds, maxMb }) {
  const [state, setState] = useState({});
  const mediaIds = useRef({}); // key -> ids currently on the backend
  const limitFor = useCallback(file => (typeof maxMb === 'function' ? maxMb(file) : maxMb), [maxMb]);

  const update = (key, patch) =>
    setState(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // Old files are removed in the background: the new one is already in, and a
  // failed delete must not undo it (the backend refuses once it's submitted).
  const removeOld = useCallback(
    (ids, keep) => {
      if (!removeFn) {
        return;
      }
      ids.filter(id => id && id !== keep).forEach(id => removeFn(id).catch(() => {}));
    },
    [removeFn],
  );

  const uploadFile = useCallback(
    async (key, file) => {
      const limitMb = limitFor(file);
      if (file.fileSize > limitMb * 1024 * 1024) {
        update(key, { error: tNow('valuation.upload.tooLarge', { mb: limitMb }) });
        return;
      }
      const previous = mediaIds.current[key] ?? existingIds?.(key) ?? [];
      update(key, { uploading: true, error: null });
      try {
        const result = await uploadFn(key, file);
        const newId = result?.mediaId ?? null;
        mediaIds.current[key] = newId ? [newId] : [];
        update(key, {
          uploading: false,
          uploaded: true,
          fileSize: file.fileSize,
          // A PDF has no image to show: the row shows its document icon.
          preview: file.uri && !isPdf(file) ? { uri: file.uri } : null,
          isPdf: isPdf(file),
        });
        removeOld(previous, newId);
      } catch (e) {
        // A failed replacement keeps the current file (still `uploaded`).
        update(key, { uploading: false, error: e.message || tNow('valuation.upload.failed') });
      }
    },
    [uploadFn, existingIds, removeOld, limitFor],
  );

  // Picks with `picker` (resolves to a file, or null when cancelled) and uploads it.
  const uploadPicked = useCallback(
    async (key, picker) => {
      let file;
      try {
        file = await picker();
      } catch (e) {
        update(key, { error: e.message });
        return;
      }
      if (file) {
        await uploadFile(key, file);
      }
    },
    [uploadFile],
  );

  const uploadFromGallery = useCallback(key => uploadPicked(key, pickImageFromGallery), [uploadPicked]);
  const uploadFromFiles = useCallback(key => uploadPicked(key, pickPdf), [uploadPicked]);

  const isUploaded = key => !!state[key]?.uploaded;

  return { uploads: state, uploadFile, uploadFromGallery, uploadFromFiles, isUploaded };
}
