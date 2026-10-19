import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useRemoteData from '../../../hooks/useRemoteData';
import {
  deleteInspectorFile,
  getCaptureData,
  saveInspectorAnswer,
  uploadInspectorFile,
} from '../../../api/services/inspector.api';
import { ROUTES } from '../../../navigation/routes';
import { tNow } from '../../../i18n';
import useFileUploads from '../../valuation/uploads/useFileUploads';
import { MAX_DOCUMENT_MB, MAX_PHOTO_MB } from '../constants';

// Documents (any item asking for one) may be bigger than photos.
const maxMbFor = file => (String(file?.type ?? '').includes('pdf') ? MAX_DOCUMENT_MB : MAX_PHOTO_MB);

const fileKey = (itemCode, shotCode) => `${itemCode}|${shotCode}`;

// An answer the backend accepts: a severity, and a reason when "N/A".
export const isAnswered = answer =>
  !!answer?.severity && (answer.severity !== 'NOT_ASSESSABLE' || !!answer.naReason);

// Inspection capture state (as the web's wizard): the checklist for this
// inspection, saved answers (each change is saved straight away), photo /
// document uploads per shot, and what still blocks submitting.
// The in-app camera returns photos through route params ({ captured: { key, file } }).
export default function useCapture({ inspectionId, navigation, route }) {
  const remote = useRemoteData(() => getCaptureData(inspectionId), [inspectionId]);
  const items = useMemo(() => remote.data?.items ?? [], [remote.data]);
  const [answers, setAnswers] = useState({});
  const [saveState, setSaveState] = useState({}); // code -> 'saving' | 'saved' | message
  // Identity (VIN / RC) cards keep their read + typed-in details here, keyed by
  // item code, so moving to another step and back doesn't lose an unsaved entry
  // (the card itself unmounts; this hook stays mounted). Session-only.
  const [identityDrafts, setIdentityDrafts] = useState({}); // code -> { readState, formState }
  const seededFor = useRef(null);

  // Start from the answers already saved on the backend (resume).
  useEffect(() => {
    if (remote.data && seededFor.current !== remote.data.inspection.id) {
      seededFor.current = remote.data.inspection.id;
      setAnswers(remote.data.inspection.answers);
    }
  }, [remote.data]);

  // Changes the answer on screen; `persist` saves it (once it's a full answer).
  // Resolves true once it's saved.
  const setAnswer = useCallback(
    async (code, answer, { persist = true } = {}) => {
      setAnswers(prev => ({ ...prev, [code]: answer }));
      if (!persist || !isAnswered(answer)) {
        return false;
      }
      setSaveState(prev => ({ ...prev, [code]: 'saving' }));
      try {
        await saveInspectorAnswer(inspectionId, code, answer);
        setSaveState(prev => ({ ...prev, [code]: 'saved' }));
        return true;
      } catch (e) {
        console.error('[SelfInspection] Answer save failed', {
          inspectionId,
          itemCode: code,
          severity: answer.severity ?? null,
          status: e.status ?? null,
          code: e.code ?? null,
          requestId: e.requestId ?? null,
          message: e.message,
          details: e.details ?? null,
        });
        setSaveState(prev => ({ ...prev, [code]: e.message || tNow('inspector.capture.saveError') }));
        return false;
      }
    },
    [inspectionId],
  );

  // Uploads: one per (item, shot). A retake replaces the shot's file: the old
  // one (also one from an earlier visit) is deleted once the new one is in.
  const uploadFn = useCallback(
    (key, file) => {
      const [itemCode, shotCode] = key.split('|');
      const item = items.find(i => i.code === itemCode);
      return uploadInspectorFile({ inspectionId, itemCode, shotCode, kind: item?.evidence?.kind ?? 'PHOTO', file });
    },
    [inspectionId, items],
  );
  // Update one item's identity draft. `updater` is a value or a (prev) => next
  // function (prev may be undefined the first time).
  const setIdentityDraft = useCallback((code, updater) => {
    setIdentityDrafts(prev => {
      const next = typeof updater === 'function' ? updater(prev[code]) : updater;
      return { ...prev, [code]: next };
    });
  }, []);

  const removeFn = useCallback(mediaId => deleteInspectorFile(inspectionId, mediaId), [inspectionId]);
  const shotMedia = remote.data?.shotMedia;
  const existingIds = useCallback(key => shotMedia?.[key] ?? [], [shotMedia]);
  const files = useFileUploads({ uploadFn, removeFn, existingIds, maxMb: maxMbFor });

  // A photo from the in-app camera.
  const captured = route.params?.captured;
  const { uploadFile } = files;
  useEffect(() => {
    if (captured) {
      uploadFile(captured.key, captured.file);
      navigation.setParams({ captured: undefined });
    }
  }, [captured, uploadFile, navigation]);

  const serverShots = remote.data?.shots;
  const shotState = useCallback(
    (itemCode, shotCode) => {
      const local = files.uploads[fileKey(itemCode, shotCode)] ?? {};
      return {
        done: !!local.uploaded || !!serverShots?.[itemCode]?.includes(shotCode),
        uploading: !!local.uploading,
        error: local.error ?? null,
        preview: local.preview ?? null,
        isPdf: !!local.isPdf,
      };
    },
    [files.uploads, serverShots],
  );

  // How many of an item's shots have a file.
  const evidenceCount = useCallback(
    item => (item.evidence ? item.evidence.shotCodes.filter(code => shotState(item.code, code).done).length : 0),
    [shotState],
  );

  // What stops submitting: required items not answered, and answered items
  // (not N/A) without their minimum photos / documents.
  const problems = useMemo(
    () =>
      items
        .map((item, index) => {
          const answer = answers[item.code];
          if (item.mandatory && !isAnswered(answer)) {
            return { item, index, kind: 'answer' };
          }
          if (
            isAnswered(answer) &&
            answer.severity !== 'NOT_ASSESSABLE' &&
            item.evidence &&
            evidenceCount(item) < item.evidence.minCount
          ) {
            return { item, index, kind: 'evidence' };
          }
          return null;
        })
        .filter(Boolean),
    [answers, evidenceCount, items],
  );

  return {
    ...remote,
    items,
    answers,
    setAnswer,
    saveState,
    shotState,
    evidenceCount,
    problems,
    identityDrafts,
    setIdentityDraft,
    // In-app camera; the photo comes back to this screen (see `captured`).
    takePhoto: (item, shotCode, title) =>
      navigation.navigate(ROUTES.VEHICLE_CAMERA, {
        shot: { key: fileKey(item.code, shotCode), title },
        returnTo: ROUTES.INSPECTION_CAPTURE,
      }),
    // Documents can also come from the gallery or as a PDF (as the web allows).
    // source: 'gallery' | 'pdf'
    pickFile: (item, shotCode, source = 'gallery') =>
      source === 'pdf'
        ? files.uploadFromFiles(fileKey(item.code, shotCode))
        : files.uploadFromGallery(fileKey(item.code, shotCode)),
  };
}
