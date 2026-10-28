import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../../api/client';
import {
  USABLE_MEDIA,
  deleteSelfMedia,
  estimateFinalValue,
  getSelfInspection,
  getThumbUrl,
  listSelfInspectionMedia,
  recordSelfAnswer,
  reopenSelfInspection,
  saveAiFinding,
  submitSelfInspection,
  payForSelfInspection,
  SELF_INSPECTION_FEE_REQUIRED,
  uploadSelfEvidence,
} from '../../../api/services/selfInspection.api';
import { analyzeDamageWithOpenAI } from '../../../api/services/visionScan';
import { DUPLICATE_FILE } from '../../../api/services/valuation.api';
import { fileToBase64 } from '../../../utils/fileToBase64';
import { photoDhash } from '../../../utils/photoDhash';
import { getPhotoLocation } from '../../../utils/photoLocation';
import { tNow } from '../../../i18n';
import { getUser } from '../../../store/userStore';
import { shotName } from './labels';
import {
  buildAiFinding,
  buildCanonicalProfile,
  buildFinalValuationRequest,
  buildItemLabelMap,
  buildMissingList,
  buildPricingSummary,
  buildProgress,
  collectAngleFindings,
  crossValidateVehicle,
  decideForSavedSeverity,
  explainIntegrityFailure,
  findNearDuplicate,
  findingToShotRead,
  humanizeSubmitError,
  isPhotoGridItem,
  newestFindingFor,
  parseOdometerKm,
  parseOwnerCount,
  partitionItems,
  photoGroups,
  photoSlots,
  toDamageVehicleContext,
} from '../../../vendor/selfInspectionLogic';

// The web's /inspect/[id] screen state, ported one to one (SelfInspectionCaptureView):
// answers (saved in tap order, the newest result wins), evidence per (item, shot)
// with retake / remove, the AI damage pass on every walkaround photo (persisted
// as the photo's finding, advisory only), submit / reopen and the final value.
// Grouping, progress, the "what's left" list and the live estimate are the
// web's own functions (src/vendor/selfInspectionLogic.js).

const DOCUMENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

export const blankAnswer = () => ({ note: '', cost: '', num: '', naReason: '' });
export const slotKey = (itemCode, shotCode) => `${itemCode}:${shotCode}`;

// O2 counts owners; every other number reads km-like units (as the web).
export const numericParserFor = itemCode => (itemCode === 'O2' ? parseOwnerCount : parseOdometerKm);

// 'PHOTO' | 'DOCUMENT' | 'VIDEO' for an item's evidence.
export const uploadKindFor = item => {
  const kinds = item.evidence_requirement?.kinds ?? [];
  if (kinds.includes('DOCUMENT')) return 'DOCUMENT';
  if (kinds.includes('VIDEO')) return 'VIDEO';
  return 'PHOTO';
};

const noun = kind => tNow(`selfInspection.noun.${kind}`);

const deleteErrorText = err =>
  err instanceof ApiError && err.status === 409
    ? tNow('selfInspection.error.stillChecking')
    : err?.message || tNow('selfInspection.error.removeFailed');

// A replaced photo the server won't let go of yet (still being checked) is
// removed in the background: tried again on this schedule (~10 minutes).
const BACKGROUND_REMOVE_DELAYS_MS = [5000, 10000, 15000, 30000, 30000, 60000, 60000, 90000, 120000, 180000];

// A photo is refused for removal (409) while the server is still checking it
// (integrity, plate blur, preview) - usually a few seconds after upload. Wait
// and try again by itself, up to about 30 s, before showing an error.
const DELETE_RETRY_DELAYS_MS = [1500, 2500, 3000, 4000, 4000, 5000, 5000, 5000];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const isStillProcessing = err => err instanceof ApiError && err.status === 409;

export const deleteWhenReady = async (mediaId, remove = deleteSelfMedia) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await remove(mediaId);
      return;
    } catch (err) {
      if (!isStillProcessing(err) || attempt >= DELETE_RETRY_DELAYS_MS.length) {
        throw err;
      }
      await wait(DELETE_RETRY_DELAYS_MS[attempt]);
    }
  }
};

export default function useSelfInspection(inspectionId) {
  // 'loading' | 'ready' | 'error' | 'not-editable' | 'submitted'
  const [screen, setScreen] = useState('loading');
  const [sections, setSections] = useState([]);
  const [inspection, setInspection] = useState(null);
  const [local, setLocal] = useState({});
  const localRef = useRef({});
  const saveChain = useRef({});
  const saveSeq = useRef({});
  const [mediaCount, setMediaCount] = useState({});
  const [mediaShots, setMediaShots] = useState({});
  const [mediaFiles, setMediaFiles] = useState({});
  const [thumbs, setThumbs] = useState({});
  const [uploading, setUploading] = useState({});
  const [removing, setRemoving] = useState({});
  const [slotMsg, setSlotMsg] = useState({});
  // The last finished upload: { key, n } (n counts up, so the same slot twice still changes).
  const [lastUpload, setLastUpload] = useState(null);
  const liveMedia = useRef(new Set());
  const [persisted, setPersisted] = useState({});
  const [analysis, setAnalysis] = useState({});
  const [aiVerdictSaved, setAiVerdictSaved] = useState({});
  const aiInflight = useRef(new Set());
  const [identity, setIdentity] = useState({ rc: null, vin: null, engine: null });
  const [integrityItems, setIntegrityItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // The self-inspection fee didn't go through: { kind, message } (PaymentNotice).
  const [payProblem, setPayProblem] = useState(null);
  // The self-inspection fee being taken during submit: 'starting' | 'confirming' | null.
  const [payPhase, setPayPhase] = useState(null);
  const [finalStatus, setFinalStatus] = useState(null);
  const [final, setFinal] = useState({ loading: false, card: null, valuation: null, note: '', error: '' });
  const finalFetchRef = useRef(null);
  // Photos waiting to be removed in the background (replaced by a retake while
  // the server was still checking them). Stops when the screen closes.
  const pendingRemoval = useRef(new Set());
  // Fingerprints of the photos uploaded on this visit, for the "looks like
  // your other photo" hint (as the web: this session only). { hash, label, mediaId }
  const seenDhash = useRef([]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);
  const inspectionVehicle = inspection?.vehicle ?? null;
  const vehicleId = inspection?.vehicle_id ?? null;

  const updateLocal = useCallback((code, fn) => {
    const next = { ...localRef.current, [code]: fn(localRef.current[code] ?? blankAnswer()) };
    localRef.current = next;
    setLocal(next);
  }, []);
  const setMsg = useCallback((key, msg) => setSlotMsg(m => ({ ...m, [key]: msg })), []);

  // --- Load ------------------------------------------------------------------------

  const load = useCallback(async () => {
    setScreen('loading');
    try {
      const data = await getSelfInspection(inspectionId);
      const ins = data.inspection;
      setInspection(ins);
      setSections(data.sections);

      const seed = {};
      const verdicts = {};
      for (const it of ins.items ?? []) {
        seed[it.item_code] = {
          severity: it.severity,
          note: it.text_note ?? '',
          cost: it.refurb_cost_minor != null ? String(Math.round(it.refurb_cost_minor / 100)) : '',
          num: it.numeric_value != null ? String(it.numeric_value) : '',
          naReason: it.na_reason ?? '',
          saved: true,
        };
        // Previously recorded verdicts stay recorded - never re-attached.
        if (it.ml_suggestion?.decision) verdicts[it.item_code] = it.ml_suggestion.decision;
      }
      localRef.current = seed;
      setLocal(seed);
      setAiVerdictSaved(verdicts);

      const counts = {};
      const shots = {};
      const fileMap = {};
      const found = {};
      const states = {};
      liveMedia.current = new Set();
      seenDhash.current = [];
      // Oldest first, so an angle's last file is its newest photo.
      const media = [...data.media].sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
      for (const mv of media) {
        if (!USABLE_MEDIA.has(mv.status)) continue;
        liveMedia.current.add(mv.id);
        counts[mv.item_code] = (counts[mv.item_code] ?? 0) + 1;
        const list = shots[mv.item_code] ?? [];
        if (!list.includes(mv.shot_code)) list.push(mv.shot_code);
        shots[mv.item_code] = list;
        fileMap[mv.item_code] = [...(fileMap[mv.item_code] ?? []), { id: mv.id, shotCode: mv.shot_code, status: mv.status }];
        // Persisted findings rehydrate the estimate without calling the AI again.
        if (mv.item_code === 'B1' && mv.ai_finding) {
          found[mv.shot_code] = { finding: mv.ai_finding, mediaId: mv.id };
          states[mv.shot_code] = 'saved';
        }
      }
      setMediaCount(counts);
      setMediaShots(shots);
      setMediaFiles(fileMap);
      setPersisted(found);
      setAnalysis(states);
      // An angle holds one photo: older ones left by a retake the server
      // wasn't ready for are removed in the background (photo grids only -
      // a document can have several pages).
      const gridCodes = new Set(
        data.sections.flatMap(s => s.items).filter(it => isPhotoGridItem(it)).map(it => it.item_code),
      );
      Object.entries(fileMap).forEach(([code, files]) => {
        if (!gridCodes.has(code)) return;
        const byShot = {};
        files.forEach(f => (byShot[f.shotCode] = [...(byShot[f.shotCode] ?? []), f]));
        Object.entries(byShot).forEach(([shotCode, list]) => {
          list.slice(0, -1).forEach(f => removeLaterRef.current?.(code, shotCode, f.id));
        });
      });
      // Signed thumbnails for photos taken earlier (best effort).
      data.media
        .filter(mv => mv.kind === 'PHOTO' && (mv.derivatives ?? []).some(d => d.variant === 'THUMB'))
        .forEach(mv => {
          getThumbUrl(mv.id)
            .then(url => url && setThumbs(t => (t[mv.id] ? t : { ...t, [mv.id]: url })))
            .catch(() => {});
        });

      if (ins.status !== 'IN_PROGRESS') {
        if (ins.status === 'DRAFT') {
          setScreen('not-editable');
          return;
        }
        // Opened again later (Garage "Continue" / "View summary"): the same
        // result screen as right after submit - a failed photo check offers
        // "Retake photos" with what needs retaking.
        setFinalStatus(ins.status);
        if (ins.status === 'INTEGRITY_FAILED') {
          try {
            const labels = buildItemLabelMap(data.sections.flatMap(s => s.items));
            setIntegrityItems(explainIntegrityFailure(data.media, labels).map(r => r.item));
          } catch {
            // keep the general retake message
          }
        }
        setScreen('submitted');
        return;
      }
      setScreen('ready');
    } catch {
      setScreen('error');
    }
  }, [inspectionId]);

  useEffect(() => {
    load();
  }, [load]);

  // --- Answers -----------------------------------------------------------------------

  // Saves an item's answer (patch merged into what's on screen). Numbers are
  // validated and carry OK by themselves. Resolves true once saved.
  // ai: { finding, mediaId, forcedVerdict } when the answer judges an AI suggestion.
  const record = useCallback(
    async (code, patch, ai) => {
      const cur = { ...(localRef.current[code] ?? blankAnswer()), ...patch };
      const spec = allItems.find(i => i.item_code === code);
      const isNumeric = spec?.answer_type === 'NUMERIC';
      if (isNumeric) {
        const n = numericParserFor(code)(cur.num);
        if (cur.num.trim() !== '' && n == null) {
          updateLocal(code, () => ({ ...cur, saved: false, error: tNow('selfInspection.error.number') }));
          return false;
        }
        if (n != null && !cur.severity) cur.severity = 'OK';
      }
      updateLocal(code, () => ({ ...cur, saved: false, error: undefined }));
      if (!cur.severity) return false;
      if (cur.severity === 'NOT_ASSESSABLE' && !cur.naReason) return false;

      const body = { severity: cur.severity };
      if (cur.note.trim()) body.text_note = cur.note.trim();
      const costNum = Number(cur.cost);
      if (cur.cost.trim() && Number.isFinite(costNum) && costNum >= 0) body.refurb_cost_minor = Math.round(costNum * 100);
      if (isNumeric) {
        const n = numericParserFor(code)(cur.num);
        if (n != null) body.numeric_value = n;
      }
      if (cur.severity === 'NOT_ASSESSABLE') body.na_reason = cur.naReason;
      // The B1 answer judges a persisted AI finding: its suggestion + the verdict
      // ride along (advisory lineage only; scoring never reads it).
      let attachedVerdict = null;
      if (code === 'B1' && cur.severity !== 'NOT_ASSESSABLE' && !aiVerdictSaved[code]) {
        const entry = ai ?? newestFindingFor(persisted, spec?.evidence_requirement?.shot_codes ?? []);
        if (entry) {
          const extras = decideForSavedSeverity({
            finding: entry.finding,
            mediaId: entry.mediaId,
            finalSeverity: cur.severity,
            forcedVerdict: ai?.forcedVerdict,
          });
          body.inspector_override = extras.inspector_override;
          body.ml_suggestion = extras.ml_suggestion;
          attachedVerdict = extras.ml_suggestion.decision;
        }
      }

      const seq = (saveSeq.current[code] ?? 0) + 1;
      saveSeq.current[code] = seq;
      updateLocal(code, c => ({ ...c, saving: true }));
      // Chained per item so the server sees saves in tap order.
      const run = (saveChain.current[code] ?? Promise.resolve())
        .catch(() => undefined)
        .then(() => recordSelfAnswer(inspectionId, code, body));
      saveChain.current[code] = run;
      try {
        await run;
        if (attachedVerdict) setAiVerdictSaved(s => ({ ...s, [code]: attachedVerdict }));
        if (saveSeq.current[code] === seq) updateLocal(code, c => ({ ...c, saving: false, saved: true, error: undefined }));
        return true;
      } catch (e) {
        if (saveSeq.current[code] === seq) {
          updateLocal(code, c => ({
            ...c,
            saving: false,
            saved: false,
            error: e?.message || tNow('selfInspection.error.saveFailed'),
          }));
        }
        return false;
      }
    },
    [allItems, aiVerdictSaved, inspectionId, persisted, updateLocal],
  );

  // --- AI damage pass (B1 walkaround photos) ------------------------------------------

  const suggestDamage = useCallback(
    async (code, shotCode, file, mediaId) => {
      if (aiInflight.current.has(mediaId)) return;
      aiInflight.current.add(mediaId);
      const alive = () => liveMedia.current.has(mediaId);
      setAnalysis(s => ({ ...s, [shotCode]: 'pending' }));
      try {
        const base64 = await fileToBase64(file);
        if (!base64) throw new Error('unreadable');
        const spec = allItems.find(i => i.item_code === code);
        const res = await analyzeDamageWithOpenAI(base64, {
          vehicle: toDamageVehicleContext(inspectionVehicle),
          itemCode: code,
          itemLabel: spec?.label,
          answerType: spec?.answer_type,
          shotHint: shotCode,
        });
        if (!alive()) return;
        if (res.hasDamage) {
          // Pre-fill only an empty cost - never what the user typed (not saved until they answer).
          updateLocal(code, c => (c.cost.trim() ? c : { ...c, cost: String(Math.round(res.repairCostMinor / 100)) }));
        }
        const finding = buildAiFinding({
          shotCode,
          v2: {
            hasDamage: res.hasDamage,
            part: res.part,
            type: res.type,
            severity: res.severity,
            confidence: res.confidence,
            repairCostMinor: res.repairCostMinor,
            reasoning: res.reasoning,
            promptVersion: res.promptVersion,
            cosmetic: res.cosmetic ?? [],
          },
          plate: null,
        });
        setAnalysis(s => ({ ...s, [shotCode]: 'saving' }));
        await saveAiFinding(mediaId, finding);
        if (!alive()) return;
        setPersisted(p => ({ ...p, [shotCode]: { finding, mediaId } }));
        setAnalysis(s => ({ ...s, [shotCode]: 'saved' }));
      } catch {
        if (alive()) setAnalysis(s => ({ ...s, [shotCode]: 'failed' }));
      } finally {
        aiInflight.current.delete(mediaId);
      }
    },
    [allItems, inspectionVehicle, updateLocal],
  );

  // --- Evidence ------------------------------------------------------------------------

  const forgetAsset = useCallback((code, shotCode, id) => {
    liveMedia.current.delete(id);
    seenDhash.current = seenDhash.current.filter(d => d.mediaId !== id);
    setMediaFiles(prev => ({ ...prev, [code]: (prev[code] ?? []).filter(f => f.id !== id) }));
    setMediaCount(c => ({ ...c, [code]: Math.max(0, (c[code] ?? 0) - 1) }));
    setThumbs(t => {
      if (!t[id]) return t;
      const n = { ...t };
      delete n[id];
      return n;
    });
    if (code === 'B1') {
      setPersisted(p => {
        if (p[shotCode]?.mediaId !== id) return p;
        const n = { ...p };
        delete n[shotCode];
        return n;
      });
      setAnalysis(a => {
        const n = { ...a };
        delete n[shotCode];
        return n;
      });
    }
  }, []);

  // Removes a replaced photo once the server lets go of it (it's still being
  // checked): it no longer counts on screen right away, and is tried again in
  // the background until it's gone or the screen closes.
  const removeInBackground = useCallback(
    (code, shotCode, id) => {
      if (pendingRemoval.current.has(id)) return;
      pendingRemoval.current.add(id);
      liveMedia.current.delete(id); // a late AI result for it must not land
      const attempt = async n => {
        if (!mounted.current) return;
        try {
          await deleteSelfMedia(id);
          pendingRemoval.current.delete(id);
          if (mounted.current) forgetAsset(code, shotCode, id);
        } catch (err) {
          if (isStillProcessing(err) && n < BACKGROUND_REMOVE_DELAYS_MS.length) {
            setTimeout(() => attempt(n + 1), BACKGROUND_REMOVE_DELAYS_MS[n]);
          } else {
            pendingRemoval.current.delete(id);
          }
        }
      };
      setTimeout(() => attempt(0), BACKGROUND_REMOVE_DELAYS_MS[0]);
    },
    [forgetAsset],
  );
  const removeLaterRef = useRef(removeInBackground);
  removeLaterRef.current = removeInBackground;

  // Deletes on the server (waiting out "still processing"), forgetting each as
  // it goes. dropShot: these are all of the shot's files. Returns false when
  // one couldn't be removed.
  const removeAssets = useCallback(
    async (code, shotCode, ids, dropShot) => {
      try {
        for (const id of ids) {
          await deleteWhenReady(id);
          forgetAsset(code, shotCode, id);
        }
        if (dropShot) setMediaShots(s => ({ ...s, [code]: (s[code] ?? []).filter(x => x !== shotCode) }));
        return true;
      } catch (err) {
        setMsg(slotKey(code, shotCode), { kind: 'error', text: deleteErrorText(err) });
        return false;
      }
    },
    [forgetAsset, setMsg],
  );

  // Removes a shot's photo(s), or one file of a multi-page document (onlyId).
  const deleteShot = useCallback(
    async (code, shotCode, onlyId) => {
      const ofShot = (mediaFiles[code] ?? []).filter(f => f.shotCode === shotCode);
      const ids = ofShot.filter(f => !onlyId || f.id === onlyId).map(f => f.id);
      if (ids.length === 0) return;
      const key = slotKey(code, shotCode);
      setRemoving(r => ({ ...r, [key]: true }));
      setMsg(key, undefined);
      try {
        await removeAssets(code, shotCode, ids, ids.length === ofShot.length);
      } finally {
        setRemoving(r => ({ ...r, [key]: false }));
      }
    },
    [mediaFiles, removeAssets, setMsg],
  );

  // Uploads one file for an (item, shot). replace = Retake: the old photo is
  // removed first so every angle holds one photo. If the server is still
  // checking it, the new photo goes up anyway and the old one is removed in
  // the background as soon as it's allowed (a retake never gets stuck).
  const addEvidence = useCallback(
    async (code, file, kind, shotCode, replace = false) => {
      if (!file) return;
      const key = slotKey(code, shotCode);
      setMsg(key, undefined);
      if (kind === 'DOCUMENT') {
        const type = String(file.type ?? '').toLowerCase();
        if ((type && !DOCUMENT_TYPES.has(type)) || (file.fileSize ?? 0) > DOCUMENT_MAX_BYTES) {
          setMsg(key, { kind: 'error', text: tNow('selfInspection.error.documentType') });
          return;
        }
      }
      setUploading(u => ({ ...u, [key]: true }));
      const later = [];
      // Started right away so they run alongside the upload steps: where the
      // photo was taken (best effort, as the web) and the photo's fingerprint.
      const gpsPromise = getPhotoLocation();
      const isPhoto = kind === 'PHOTO' && String(file.type ?? 'image/jpeg').startsWith('image/');
      const dhashPromise = isPhoto ? photoDhash(file) : Promise.resolve(null);
      try {
        if (replace) {
          const oldIds = (mediaFiles[code] ?? [])
            .filter(f => f.shotCode === shotCode && !pendingRemoval.current.has(f.id))
            .map(f => f.id);
          for (const id of oldIds) {
            try {
              await deleteSelfMedia(id);
              forgetAsset(code, shotCode, id);
            } catch (err) {
              if (!isStillProcessing(err)) {
                setMsg(key, { kind: 'error', text: deleteErrorText(err) });
                return;
              }
              later.push(id);
            }
          }
        }
        const gps = await gpsPromise;
        const mv = await uploadSelfEvidence({ inspectionId, itemCode: code, shotCode, kind, file, gps });
        liveMedia.current.add(mv.mediaId);
        // "Looks like your other photo": advisory only, never blocks (adjacent
        // angles of a car can look alike) - the web's near-duplicate hint.
        const hash = await dhashPromise;
        if (hash) {
          const hit = findNearDuplicate(hash, seenDhash.current);
          if (hit && hit.label !== shotCode) {
            setMsg(key, { kind: 'warn', text: tNow('selfInspection.warn.nearDuplicate', { label: shotName(tNow, hit.label) }) });
          }
          seenDhash.current = [...seenDhash.current, { hash, label: shotCode, mediaId: mv.mediaId }];
        }
        setMediaFiles(prev => ({
          ...prev,
          [code]: [...(prev[code] ?? []).filter(f => f.id !== mv.mediaId), { id: mv.mediaId, shotCode, status: mv.status }],
        }));
        setMediaCount(c => ({ ...c, [code]: (c[code] ?? 0) + 1 }));
        setMediaShots(s => {
          const list = s[code] ?? [];
          return list.includes(shotCode) ? s : { ...s, [code]: [...list, shotCode] };
        });
        // The replaced photo(s) the server still holds: remove in the background.
        later.forEach(id => removeInBackground(code, shotCode, id));
        setLastUpload(prev => ({ key, n: (prev?.n ?? 0) + 1 }));
        const isImage = String(file.type ?? 'image/jpeg').startsWith('image/');
        if (isImage && file.uri) setThumbs(t => ({ ...t, [mv.mediaId]: file.uri }));
        // The advisory damage read for each walkaround photo (never saved as an answer).
        if (kind === 'PHOTO' && code === 'B1' && isImage) {
          suggestDamage(code, shotCode, file, mv.mediaId);
        }
      } catch (err) {
        const text =
          err?.code === DUPLICATE_FILE
            ? tNow('selfInspection.error.duplicate', { noun: noun(kind) })
            : err?.message || tNow('selfInspection.error.uploadFailed', { noun: noun(kind) });
        setMsg(key, { kind: 'error', text });
      } finally {
        setUploading(u => ({ ...u, [key]: false }));
      }
    },
    [inspectionId, mediaFiles, forgetAsset, removeInBackground, setMsg, suggestDamage],
  );

  // --- Identity (RC / VIN cards): the confirmed values feed the live estimate --------

  const confirmRc = useCallback(
    async (note, evidence) => {
      const ok = await record('P1', { severity: 'OK', note });
      if (ok && evidence) {
        setIdentity(s => ({
          ...s,
          // rcEvidence(): { vin, engineNumber, frontPlate, make, model, variant, mfgYear, fuel }
          rc: {
            registrationNumber: evidence.frontPlate ?? null,
            chassisNumber: evidence.vin ?? null,
            engineNumber: evidence.engineNumber ?? null,
            make: evidence.make ?? null,
            model: evidence.model ?? null,
            variant: evidence.variant ?? null,
            mfgYear: evidence.mfgYear ?? null,
          },
        }));
      }
      return ok;
    },
    [record],
  );

  const confirmVin = useCallback(
    async (note, evidence) => {
      const ok = await record('A1', { severity: 'OK', note });
      if (ok && evidence) {
        // vinEvidence(): { vin, engineNumber }
        setIdentity(s => ({ ...s, vin: evidence.vin ?? null, engine: evidence.engineNumber ?? null }));
      }
      return ok;
    },
    [record],
  );

  // --- Submit -------------------------------------------------------------------------

  // Sends it in; the server re-checks everything. When the self-inspection fee
  // is on and unpaid (402 SELF_INSPECTION_FEE_REQUIRED, as the web), the fee is
  // taken first and the inspection is submitted again once the server confirms
  // the payment. Fee off or already paid: the first submit just works.
  const runSubmit = useCallback(async () => {
    const { status } = await submitSelfInspection(inspectionId);
    setFinalStatus(status);
    if (status === 'INTEGRITY_FAILED') {
      try {
        const labels = buildItemLabelMap(allItems);
        const reasons = explainIntegrityFailure(await listSelfInspectionMedia(inspectionId), labels);
        setIntegrityItems(reasons.map(r => r.item));
      } catch {
        // keep the general retake message
      }
    }
    setScreen('submitted');
  }, [allItems, inspectionId]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError('');
    setPayProblem(null);
    const labels = buildItemLabelMap(allItems);
    const errorText = e =>
      e?.message ? humanizeSubmitError(e.message, labels) : tNow('selfInspection.error.submitFailed');
    try {
      await runSubmit();
    } catch (e) {
      if (e?.code !== SELF_INSPECTION_FEE_REQUIRED) {
        setSubmitError(errorText(e));
        return;
      }
      const user = getUser();
      const paid = await payForSelfInspection(inspectionId, {
        onPhase: setPayPhase,
        prefill: { name: user?.fullName || undefined, email: user?.email || undefined, contact: user?.contact || undefined },
      });
      setPayPhase(null);
      if (paid.result === 'paid') {
        try {
          await runSubmit();
        } catch (e2) {
          setSubmitError(errorText(e2));
        }
        return;
      }
      // Not paid (yet): stay on review, with a PaymentNotice card; Submit
      // again once it's confirmed.
      if (paid.result === 'awaiting') {
        setPayProblem({ kind: 'awaiting', message: tNow('selfInspection.pay.awaiting') });
      } else if (paid.result === 'unavailable') {
        setPayProblem({ kind: 'unavailable', message: tNow('selfInspection.pay.unavailable') });
      } else {
        setPayProblem({ kind: paid.kind ?? 'failed', message: paid.error || tNow('selfInspection.pay.failed') });
      }
    } finally {
      setPayPhase(null);
      setSubmitting(false);
    }
  }, [allItems, inspectionId, runSubmit]);

  // Integrity failed: reopen (INTEGRITY_FAILED -> IN_PROGRESS) and load the
  // capture again so the flagged photos can be retaken.
  const fixPhotos = useCallback(async () => {
    setReopening(true);
    setSubmitError('');
    try {
      await reopenSelfInspection(inspectionId);
      setFinalStatus(null);
      setIntegrityItems([]);
      await load();
    } catch (e) {
      setSubmitError(e?.message || tNow('selfInspection.error.reopenFailed'));
    } finally {
      setReopening(false);
    }
  }, [inspectionId, load]);

  // --- Derived (the web's own functions) ----------------------------------------------

  const has = code => allItems.some(i => i.item_code === code);
  const numericOf = code => numericParserFor(code)(local[code]?.num ?? '');
  const odometerKm = has('O1') ? numericOf('O1') : null;
  const ownerCount = has('O2') ? numericOf('O2') : null;

  // The final estimated value after submit: one backend request per input set.
  useEffect(() => {
    if (screen !== 'submitted' || finalStatus === 'INTEGRITY_FAILED' || !vehicleId) return;
    const fetchKey = JSON.stringify([inspectionId, odometerKm, ownerCount]);
    if (finalFetchRef.current === fetchKey) return;
    finalFetchRef.current = fetchKey;
    setFinal({ loading: true, card: null, valuation: null, note: '', error: '' });
    estimateFinalValue(
      buildFinalValuationRequest({ vehicleId, inspectionId, odometerKm, ownerCount, declaredCondition: null }),
    )
      .then(res => setFinal({ loading: false, card: res.card, valuation: res.valuation, note: res.reason ?? '', error: '' }))
      .catch(e =>
        setFinal({ loading: false, card: null, valuation: null, note: '', error: e?.message || tNow('selfInspection.error.finalFailed') }),
      );
  }, [screen, finalStatus, inspectionId, vehicleId, odometerKm, ownerCount]);

  const derived = useMemo(() => {
    const partition = partitionItems(allItems);
    const groups = photoGroups(allItems);
    const slots = photoSlots(allItems);
    const progress = buildProgress(allItems, local, mediaShots);
    const missing = buildMissingList({
      items: allItems,
      answers: local,
      evidenceCount: mediaCount,
      parseNumeric: (code, raw) => numericParserFor(code)(raw),
    });
    const v = inspectionVehicle;
    const rc = identity.rc;
    const crossCheck = crossValidateVehicle({
      rc: rc
        ? {
            registrationNumber: rc.registrationNumber,
            vin: rc.chassisNumber,
            chassisNumber: rc.chassisNumber,
            engineNumber: rc.engineNumber,
            make: rc.make,
            model: rc.model,
            variant: rc.variant,
          }
        : undefined,
      vinPhoto: { vin: identity.vin, engineNumber: identity.engine },
      frontPlate: null,
      rearPlate: null,
      vehicle: { make: v?.make ?? null, model: v?.model ?? null, variant: v?.variant ?? null },
    });
    const canonical = buildCanonicalProfile({
      verdicts: crossCheck,
      vehicle: {
        make: v?.make ?? null,
        model: v?.model ?? null,
        variant: v?.variant ?? null,
        category: v?.category === 'PASSENGER' || v?.category === 'TWO_WHEELER' ? v.category : null,
        fuel: v?.fuel ?? null,
        segmentTier: v?.segment_tier ?? null,
        baseExShowroomMinor: v?.base_ex_showroom_minor ?? null,
        mfgYear: v?.mfg_year ?? null,
        ageYears: v?.age_years ?? null,
      },
      rc: rc ? { make: rc.make, model: rc.model, variant: rc.variant } : undefined,
      rcMfgYear: rc?.mfgYear ?? null,
      odometerKm,
      previousOwners: ownerCount,
    });
    let pricing = { estimatedPriceMinor: null, lowerPriceMinor: null, upperPriceMinor: null, confidence: null };
    try {
      pricing = buildPricingSummary({
        canonical,
        angles: collectAngleFindings(Object.values(persisted).map(p => findingToShotRead(p.finding))),
        comparables: [],
        repairReferences: [],
        asOfYear: new Date().getFullYear(),
      }).result;
    } catch {
      // no estimate yet
    }
    return {
      partition,
      groups,
      requiredSlots: slots.filter(s => !s.optional),
      progress,
      missing,
      canonicalReady: canonical.status === 'READY',
      pricing,
    };
  }, [allItems, local, mediaShots, mediaCount, inspectionVehicle, identity, odometerKm, ownerCount, persisted]);

  return {
    screen,
    reload: load,
    inspection,
    sections,
    allItems,
    local,
    updateLocal,
    record,
    mediaFiles,
    mediaShots,
    thumbs,
    uploading,
    removing,
    slotMsg,
    lastUpload,
    addEvidence,
    deleteShot,
    persisted,
    analysis,
    aiVerdictSaved,
    confirmRc,
    confirmVin,
    submitting,
    payPhase,
    submit,
    submitError,
    payProblem,
    reopening,
    fixPhotos,
    finalStatus,
    integrityItems,
    final,
    ...derived,
  };
}
