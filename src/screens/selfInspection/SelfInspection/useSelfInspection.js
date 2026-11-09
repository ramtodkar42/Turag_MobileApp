import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../../api/client';
import {
  USABLE_MEDIA,
  analyzeMedia,
  deleteSelfMedia,
  estimateFinalValue,
  getReferenceValuation,
  getSelfInspection,
  getThumbUrl,
  listSelfInspectionMedia,
  recordSelfAnswer,
  reopenSelfInspection,
  reportEngineSound,
  saveAiFinding,
  submitSelfInspection,
  payForSelfInspection,
  SELF_INSPECTION_FEE_REQUIRED,
  submitEngineFrames,
  uploadSelfEvidence,
} from '../../../api/services/selfInspection.api';
import { scanDamagePhoto } from '../../../api/services/aiScan.api';
import { getInspectionReport } from '../../../api/services/report.api';
import { DUPLICATE_FILE, verifyInspectionIdentity } from '../../../api/services/valuation.api';
import { fileToBase64 } from '../../../utils/fileToBase64';
import { photoDhash } from '../../../utils/photoDhash';
import { photoQualityWarnings } from '../../../utils/photoQuality';
import { extractEngineFrames, measureEngineSound } from '../../../utils/engineClip';
import { getPhotoLocation } from '../../../utils/photoLocation';
import { tNow } from '../../../i18n';
import { getUser } from '../../../store/userStore';
import { shotName } from './labels';
import useIntegrityWatch from './useIntegrityWatch';
import { integrityReasonsFor } from './integrityReasons';
import { videoUploadErrorText } from './videoUploadError';
import {
  activeItemsFor,
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
  findNearDuplicate,
  findingToShotRead,
  humanizeSubmitError,
  isPhotoGridItem,
  newestFindingFor,
  parseKeyCount,
  parseOdometerKm,
  parseOwnerCount,
  partitionItems,
  photoGroups,
  photoSections,
  photoSlots,
  previousOwnersFromRegistry,
  selfIdentityMismatchFields,
  selfIdentityReads,
  summarizeCondition,
  toDamageVehicleContext,
  totalOwnersFromPrevious,
} from '../../../vendor/selfInspectionLogic';

// The web's /inspect/[id] screen state, ported one to one (SelfInspectionCaptureView):
// answers (saved in tap order, the newest result wins), evidence per (item, shot)
// with retake / remove, the AI damage pass on every walkaround photo (persisted
// as the photo's finding, advisory only), submit / reopen and the final value.
// Grouping, progress, the "what's left" list and the live estimate are the
// web's own functions (src/vendor/selfInspectionLogic.js).
// A self-inspection (M1) differs from an inspector's (M2): the server runs its AI reads
// from the stored photos, the engine clip is read for QC, and it adds warnings that
// never block (a mismatched RC or chassis, flagged and poor-quality photos). M2 keeps
// the phone's AI read and sends the condition level it works out from it.

const DOCUMENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

export const blankAnswer = () => ({ note: '', cost: '', num: '', naReason: '', value: '' });
export const slotKey = (itemCode, shotCode) => `${itemCode}:${shotCode}`;

// A typed answer saves this long after the last key.
const TYPED_SAVE_DELAY_MS = 800;

// The inspector's confirmed RC / VIN reads against this vehicle (the web's #20
// RC-vs-vehicle alert): the fields whose read doesn't match - make, model, VIN,
// registration - as IdentityMismatchBanner names them.
const INSPECTOR_MISMATCH = [
  ['make', 'MAKE'],
  ['model', 'MODEL'],
  ['vin', 'CHASSIS'],
  ['registrationNumber', 'REGISTRATION'],
];
export const inspectorMismatchFields = crossCheck =>
  INSPECTOR_MISMATCH.filter(([key]) => crossCheck?.[key]?.verdict === 'MISMATCH').map(([, field]) => field);

// A file the server's photo check failed (the web's explainIntegrityFailure
// rule: risk score above 70) - it has to be taken again.
const failedIntegrity = mv => (mv.integrity?.risk_score ?? 0) > 70;

// The photo kept behind a VIN / odometer scan (scan_evidence in the checklist): it has
// no tile, and nothing waits for it. Returns a test for a media row.
const scanPhotoTest = (items, mode) => {
  const shots = new Set(
    items
      .filter(item => item.scan_evidence?.modes?.includes(mode))
      .map(item => slotKey(item.item_code, item.scan_evidence.shot_code)),
  );
  return mv => shots.has(slotKey(mv.item_code, mv.shot_code));
};

// QC has approved it: the value is settled, so it's read from the report (as the web).
const APPROVED_STATUSES = new Set(['VERIFIED', 'VALUED', 'PUBLISHED']);

// The self-inspection's engine clip (read for QC after it uploads).
const ENGINE_CLIP_SHOT = 'ENG_START_VIDEO';

// After the engine clip uploads: stills for the server to check (exhaust smoke, warning
// lamps) once it has hidden plates and faces, then the idle's sound measured here, as the
// web. One after the other, as reading the sound holds the whole soundtrack. Nothing for
// the user: a failure only means QC has no hint, and the clip itself is there to play.
const checkEngineClip = async (inspectionId, file) => {
  try {
    const frames = await extractEngineFrames(file);
    if (frames.length > 0) await submitEngineFrames(inspectionId, frames);
  } catch {
    // QC can still play the clip.
  }
  try {
    await reportEngineSound(inspectionId, await measureEngineSound(file).catch(() => null));
  } catch {
    // QC sees no measurement.
  }
};

const QUALITY_WARNING_KEYS = {
  DARK: 'selfInspection.warn.dark',
  BRIGHT: 'selfInspection.warn.bright',
  BLURRY: 'selfInspection.warn.blurry',
};

// O2 counts owners, KEYS_M1 counts keys; every other number reads km-like units (as the web).
export const numericParserFor = itemCode => {
  if (itemCode === 'O2') return parseOwnerCount;
  if (itemCode === 'KEYS_M1') return parseKeyCount;
  return parseOdometerKm;
};

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
  // Where each upload is, for the screen: { [slotKey]: { stage, fraction? } } (see uploadInspectionFile).
  const [uploadProgress, setUploadProgress] = useState({});
  const [removing, setRemoving] = useState({});
  const [slotMsg, setSlotMsg] = useState({});
  // The last finished upload: { key, n } (n counts up, so the same slot twice still changes).
  const [lastUpload, setLastUpload] = useState(null);
  const liveMedia = useRef(new Set());
  // Photos that failed the photo check: listed (so a retake replaces them) but
  // not counted towards an item's photos - so removing one takes nothing off.
  const flaggedMedia = useRef(new Set());
  const [persisted, setPersisted] = useState({});
  const [analysis, setAnalysis] = useState({});
  const [aiVerdictSaved, setAiVerdictSaved] = useState({});
  const aiInflight = useRef(new Set());
  // The scan photos kept on this visit: { [itemCode]: { uri, mediaId } }.
  const scanPhotos = useRef({});
  // The registry's answer about the confirmed RC / chassis reads (null: none yet).
  const [identityVerdicts, setIdentityVerdicts] = useState(null);
  const identityRun = useRef(0);
  const [identity, setIdentity] = useState({ rc: null, vin: null, engine: null });
  const [integrityItems, setIntegrityItems] = useState([]);
  // Photos the photo check flagged, still to retake: { [slotKey]: { code, shotCode } }.
  const [retake, setRetake] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // The self-inspection fee didn't go through: { kind, message } (PaymentNotice).
  const [payProblem, setPayProblem] = useState(null);
  // The self-inspection fee being taken during submit: 'starting' | 'confirming' | null.
  const [payPhase, setPayPhase] = useState(null);
  const [finalStatus, setFinalStatus] = useState(null);
  const [final, setFinal] = useState({ loading: false, card: null, valuation: null, note: '', error: '' });
  // The value the owner saw in Evaluate, shown as the live estimate (as the web):
  // undefined while loading, null when the vehicle has none yet.
  const [liveEstimateMinor, setLiveEstimateMinor] = useState(undefined);
  const finalFetchRef = useRef(null);
  // Photos waiting to be removed in the background (replaced by a retake while
  // the server was still checking them). Stops when the screen closes.
  const pendingRemoval = useRef(new Set());
  // Photos already taken off the screen (forgetAsset runs once per photo).
  const forgotten = useRef(new Set());
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
  const isM1 = inspection?.mode === 'M1';
  const approved = isM1 && APPROVED_STATUSES.has(inspection?.status);
  const inspectionVehicle = inspection?.vehicle ?? null;
  const vehicleId = inspection?.vehicle_id ?? null;

  const updateLocal = useCallback((code, fn) => {
    const next = { ...localRef.current, [code]: fn(localRef.current[code] ?? blankAnswer()) };
    localRef.current = next;
    setLocal(next);
  }, []);
  const setMsg = useCallback((key, msg) => setSlotMsg(m => ({ ...m, [key]: msg })), []);
  const clearRetake = useCallback(key => {
    setRetake(prev => {
      if (!prev[key]) return prev;
      const { [key]: _done, ...rest } = prev;
      return rest;
    });
  }, []);
  // By the time the answer comes the user is usually on the next angle, so besides the
  // note under the photo it's named in the retake banner. A warning only: Submit doesn't
  // wait for it, and retaking replaces the flagged photo.
  const watchIntegrity = useIntegrityWatch(inspectionId, mv => {
    if (!liveMedia.current.has(mv.id)) return;
    const key = slotKey(mv.item_code, mv.shot_code);
    setMsg(key, { kind: 'warn', text: tNow('selfInspection.warn.integrity') });
    setRetake(prev => ({ ...prev, [key]: { code: mv.item_code, shotCode: mv.shot_code } }));
  });

  // --- Load ------------------------------------------------------------------------

  const load = useCallback(async () => {
    setScreen('loading');
    try {
      const data = await getSelfInspection(inspectionId);
      const ins = data.inspection;
      const isScanPhoto = scanPhotoTest(data.sections.flatMap(s => s.items), ins.mode);
      setInspection(ins);
      setSections(data.sections);
      // Best effort: a failure only hides the live estimate, never the inspection.
      getReferenceValuation(inspectionId).then(setLiveEstimateMinor, () => setLiveEstimateMinor(null));

      const seed = {};
      const verdicts = {};
      for (const it of ins.items ?? []) {
        seed[it.item_code] = {
          severity: it.severity,
          note: it.text_note ?? '',
          cost: it.refurb_cost_minor != null ? String(Math.round(it.refurb_cost_minor / 100)) : '',
          num: it.numeric_value != null ? String(it.numeric_value) : '',
          naReason: it.na_reason ?? '',
          value: it.value_text ?? '',
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
      flaggedMedia.current = new Set();
      forgotten.current = new Set();
      seenDhash.current = [];
      scanPhotos.current = {};
      const flaggedScans = [];
      // Oldest first, so an angle's last file is its newest photo.
      const media = [...data.media].sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
      const toRetake = {};
      for (const mv of media) {
        if (!USABLE_MEDIA.has(mv.status)) continue;
        // No tile to show it on. A flagged one is dropped below, so the user is never
        // told to retake a photo they can't reach and that nothing requires.
        if (isScanPhoto(mv)) {
          if (failedIntegrity(mv)) flaggedScans.push(mv);
          continue;
        }
        liveMedia.current.add(mv.id);
        fileMap[mv.item_code] = [...(fileMap[mv.item_code] ?? []), { id: mv.id, shotCode: mv.shot_code, status: mv.status }];
        // Failed the photo check (after "Retake photos"): not done until it's
        // taken again - it stays listed above so the retake removes it.
        if (failedIntegrity(mv)) {
          flaggedMedia.current.add(mv.id);
          toRetake[slotKey(mv.item_code, mv.shot_code)] = { code: mv.item_code, shotCode: mv.shot_code };
          continue;
        }
        counts[mv.item_code] = (counts[mv.item_code] ?? 0) + 1;
        const list = shots[mv.item_code] ?? [];
        if (!list.includes(mv.shot_code)) list.push(mv.shot_code);
        shots[mv.item_code] = list;
        // Persisted findings rehydrate the estimate without calling the AI again.
        if (mv.item_code === 'B1' && mv.ai_finding) {
          found[mv.shot_code] = { finding: mv.ai_finding, mediaId: mv.id };
          states[mv.shot_code] = 'saved';
        }
      }
      // A newer photo for the same angle already replaced a flagged one.
      Object.keys(toRetake).forEach(key => {
        const { code, shotCode } = toRetake[key];
        if ((shots[code] ?? []).includes(shotCode)) delete toRetake[key];
      });
      setMediaCount(counts);
      setMediaShots(shots);
      setMediaFiles(fileMap);
      setRetake(toRetake);
      setPersisted(found);
      setAnalysis(states);
      // The owner's angle holds one photo: older ones left by a retake the server
      // wasn't ready for are removed in the background (photo grids only - a
      // document can have several pages). Not for the inspector: as on the web,
      // an inspection officer may add several photos of one angle, and each is
      // its own evidence.
      if (ins.mode === 'M1') {
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
      }
      // Signed thumbnails for photos taken earlier (best effort).
      data.media
        .filter(mv => mv.kind === 'PHOTO' && !isScanPhoto(mv) && (mv.derivatives ?? []).some(d => d.variant === 'THUMB'))
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
            setIntegrityItems(integrityReasonsFor(data.media.filter(mv => !isScanPhoto(mv))));
          } catch {
            // keep the general retake message
          }
        }
        setScreen('submitted');
        return;
      }
      await Promise.all(
        flaggedScans.map(mv =>
          deleteSelfMedia(mv.id).catch(() => removeLaterRef.current?.(mv.item_code, mv.shot_code, mv.id)),
        ),
      );
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
        // The owner's number questions: an emptied number is no answer (as the web) -
        // never saved as "OK" without its value, so it still counts as left to do.
        // ("Can't check" needs no number. The inspector's graded items keep their grade.)
        if (isM1 && cur.num.trim() === '' && cur.severity !== 'NOT_ASSESSABLE') {
          updateLocal(code, () => ({ ...cur, saved: false, error: undefined }));
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
      // Choice / date facts carry their value (the server checks it against the pinned checklist).
      if ((spec?.answer_type === 'CHOICE' || spec?.answer_type === 'DATE') && cur.severity !== 'NOT_ASSESSABLE' && cur.value) {
        body.value_text = cur.value;
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
    [allItems, aiVerdictSaved, inspectionId, isM1, persisted, updateLocal],
  );

  // Typed answers (a note, a repair cost, a number) save by themselves a moment
  // after typing stops - not only when the box loses focus, which a tap on
  // "Next" with the keyboard open never does. flushTyped() saves any still
  // waiting (before submit).
  const typedTimers = useRef({});
  const typeAnswer = useCallback(
    (code, patch) => {
      updateLocal(code, c => ({ ...c, ...patch, ...('num' in patch ? { error: undefined } : null) }));
      clearTimeout(typedTimers.current[code]);
      typedTimers.current[code] = setTimeout(() => {
        delete typedTimers.current[code];
        record(code, {});
      }, TYPED_SAVE_DELAY_MS);
    },
    [record, updateLocal],
  );
  const flushTyped = useCallback(async () => {
    const codes = Object.keys(typedTimers.current);
    codes.forEach(code => clearTimeout(typedTimers.current[code]));
    typedTimers.current = {};
    await Promise.all(codes.map(code => record(code, {})));
  }, [record]);
  // Leaving the screen with an answer still waiting: save it on the way out.
  const flushRef = useRef(flushTyped);
  flushRef.current = flushTyped;
  useEffect(() => () => flushRef.current(), []);

  // --- AI damage pass (B1 walkaround photos) ------------------------------------------

  const suggestDamage = useCallback(
    async (code, shotCode, file, mediaId) => {
      if (aiInflight.current.has(mediaId)) return;
      aiInflight.current.add(mediaId);
      const alive = () => liveMedia.current.has(mediaId);
      setAnalysis(s => ({ ...s, [shotCode]: 'pending' }));
      // Pre-fill only an empty cost - never what the user typed (not saved until they answer).
      const prefillCost = costMinor =>
        updateLocal(code, c => (c.cost.trim() ? c : { ...c, cost: String(Math.round(costMinor / 100)) }));
      try {
        let finding;
        if (isM1) {
          // The server reads the stored photo and saves the finding.
          const media = await analyzeMedia(mediaId);
          if (!alive()) return;
          finding = media?.ai_finding;
          if (!finding) throw new Error('no result');
          if (finding.has_damage) prefillCost(finding.repair_cost_minor);
        } else {
          const base64 = await fileToBase64(file);
          if (!base64) throw new Error('unreadable');
          const spec = allItems.find(i => i.item_code === code);
          const res = await scanDamagePhoto(base64, {
            vehicle: toDamageVehicleContext(inspectionVehicle),
            itemCode: code,
            itemLabel: spec?.label,
            answerType: spec?.answer_type,
            shotHint: shotCode,
          });
          if (!alive()) return;
          if (!res) throw new Error('no result');
          if (res.hasDamage) prefillCost(res.repairCostMinor);
          finding = buildAiFinding({
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
        }
        setPersisted(p => ({ ...p, [shotCode]: { finding, mediaId } }));
        setAnalysis(s => ({ ...s, [shotCode]: 'saved' }));
      } catch {
        if (alive()) setAnalysis(s => ({ ...s, [shotCode]: 'failed' }));
      } finally {
        aiInflight.current.delete(mediaId);
      }
    },
    [allItems, inspectionVehicle, isM1, updateLocal],
  );

  // Keeps the photo behind a confirmed VIN / odometer scan and has the server read it for
  // QC. No step or wait for the user, and a failure holds nothing up: QC then just sees
  // no server read. The same photo confirmed again (the value was changed) is only read
  // again. Inspections pinned to an older checklist have no scan_evidence, so nothing goes.
  const keepScanPhoto = useCallback(
    async (code, file) => {
      const spec = allItems.find(i => i.item_code === code);
      const shotCode = spec?.scan_evidence?.shot_code;
      if (!shotCode || !spec.scan_evidence.modes?.includes(inspection?.mode)) return;
      try {
        // The read is compared with the saved answer, so the answer must land first.
        await saveChain.current[code];
        const kept = scanPhotos.current[code];
        let mediaId = kept?.uri === file.uri ? kept.mediaId : null;
        if (!mediaId) {
          const gps = await getPhotoLocation();
          ({ mediaId } = await uploadSelfEvidence({ inspectionId, itemCode: code, shotCode, kind: 'PHOTO', file, gps }));
          scanPhotos.current[code] = { uri: file.uri, mediaId };
        }
        await analyzeMedia(mediaId);
      } catch {
        // Nothing for the user to act on.
      }
    },
    [allItems, inspection?.mode, inspectionId],
  );

  // --- Evidence ------------------------------------------------------------------------

  const forgetAsset = useCallback((code, shotCode, id) => {
    // Once per photo: a replaced photo is taken off the screen right away and its
    // late server removal must not take anything off a second time (the count, or
    // the newer photo's AI result).
    if (forgotten.current.has(id)) return;
    forgotten.current.add(id);
    liveMedia.current.delete(id);
    seenDhash.current = seenDhash.current.filter(d => d.mediaId !== id);
    setMediaFiles(prev => ({ ...prev, [code]: (prev[code] ?? []).filter(f => f.id !== id) }));
    // A flagged photo was never counted (load), so it takes nothing off.
    if (!flaggedMedia.current.delete(id)) {
      setMediaCount(c => ({ ...c, [code]: Math.max(0, (c[code] ?? 0) - 1) }));
    }
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
  // checked): it no longer counts on screen right away - so a missing angle can't
  // look done while the old copy waits - and is tried again in the background
  // until it's gone or the screen closes.
  const removeInBackground = useCallback(
    (code, shotCode, id) => {
      if (pendingRemoval.current.has(id)) return;
      pendingRemoval.current.add(id);
      forgetAsset(code, shotCode, id); // also: a late AI result for it must not land
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
        if (dropShot) {
          setMediaShots(s => ({ ...s, [code]: (s[code] ?? []).filter(x => x !== shotCode) }));
          clearRetake(slotKey(code, shotCode));
        }
        return true;
      } catch (err) {
        setMsg(slotKey(code, shotCode), { kind: 'error', text: deleteErrorText(err) });
        return false;
      }
    },
    [clearRetake, forgetAsset, setMsg],
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

  // Uploads one file for an (item, shot); resolves true once it's stored.
  // replace = Retake (and always for a
  // photo the photo check flagged): the new photo goes up FIRST and only then
  // is the old one removed, so a failed retake never loses the good photo.
  // If the server is still checking the old one, it's removed in the
  // background as soon as it's allowed (a retake never gets stuck).
  const addEvidence = useCallback(
    async (code, file, kind, shotCode, replaceAsked = false) => {
      if (!file) return false;
      const key = slotKey(code, shotCode);
      const replace = replaceAsked || !!retake[key];
      setMsg(key, undefined);
      if (kind === 'DOCUMENT') {
        const type = String(file.type ?? '').toLowerCase();
        if ((type && !DOCUMENT_TYPES.has(type)) || (file.fileSize ?? 0) > DOCUMENT_MAX_BYTES) {
          setMsg(key, { kind: 'error', text: tNow('selfInspection.error.documentType') });
          return false;
        }
      }
      setUploading(u => ({ ...u, [key]: true }));
      const later = [];
      // Started right away so they run alongside the upload steps: where the
      // photo was taken (best effort, as the web) and the photo's fingerprint.
      const gpsPromise = getPhotoLocation();
      const isPhoto = kind === 'PHOTO' && String(file.type ?? 'image/jpeg').startsWith('image/');
      const dhashPromise = isPhoto ? photoDhash(file) : Promise.resolve(null);
      // One at a time: each decodes the whole photo.
      const qualityPromise = isM1 && isPhoto ? dhashPromise.then(() => photoQualityWarnings(file)) : Promise.resolve([]);
      // The photo(s) this one replaces - removed only after it's safely up.
      const oldIds = replace
        ? (mediaFiles[code] ?? [])
            .filter(f => f.shotCode === shotCode && !pendingRemoval.current.has(f.id))
            .map(f => f.id)
        : [];
      try {
        const gps = await gpsPromise;
        const mv = await uploadSelfEvidence({
          inspectionId,
          itemCode: code,
          shotCode,
          kind,
          file,
          gps,
          onProgress: progress => setUploadProgress(p => ({ ...p, [key]: progress })),
        });
        liveMedia.current.add(mv.mediaId);
        for (const id of oldIds) {
          try {
            await deleteSelfMedia(id);
            forgetAsset(code, shotCode, id);
          } catch {
            // Still being checked, or a blip: removed in the background.
            later.push(id);
          }
        }
        clearRetake(key);
        // "Looks like your other photo": advisory only, never blocks (adjacent
        // angles of a car can look alike) - the web's near-duplicate hint.
        const hash = await dhashPromise;
        const warnings = [];
        if (hash) {
          const hit = findNearDuplicate(hash, seenDhash.current);
          if (hit && hit.label !== shotCode) {
            warnings.push(tNow('selfInspection.warn.nearDuplicate', { label: shotName(tNow, hit.label) }));
          }
          seenDhash.current = [...seenDhash.current, { hash, label: shotCode, mediaId: mv.mediaId }];
        }
        // Dark, washed out or blurry: the user can keep it.
        (await qualityPromise).forEach(warning => warnings.push(tNow(QUALITY_WARNING_KEYS[warning])));
        if (warnings.length > 0) setMsg(key, { kind: 'warn', text: warnings.join(' ') });
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
        // A document isn't graded: a successful upload IS its "present" answer (as
        // the web), so the mandatory item counts as answered. Once only.
        if (kind === 'DOCUMENT' && localRef.current[code]?.severity !== 'OK') {
          record(code, { severity: 'OK', naReason: '' });
        }
        // The advisory damage read for each walkaround photo (never saved as an answer).
        if (kind === 'PHOTO' && code === 'B1' && isImage) {
          suggestDamage(code, shotCode, file, mv.mediaId);
        }
        if (isM1 && kind === 'VIDEO' && shotCode === ENGINE_CLIP_SHOT) checkEngineClip(inspectionId, file);
        if (kind === 'PHOTO' && isImage) {
          // Both flows (as the web): a copied or reused photo is flagged while a retake is still easy.
          watchIntegrity(mv.mediaId);
          // Tread photos go to the server's tyre read, for QC only. A failure just means QC has no suggestion.
          if (isM1 && code === 'XTYRE' && shotCode.endsWith('_TREAD')) analyzeMedia(mv.mediaId).catch(() => {});
        }
        return true;
      } catch (err) {
        let text;
        if (err?.code === DUPLICATE_FILE) {
          text = tNow('selfInspection.error.duplicate', { noun: noun(kind) });
        } else if (kind === 'VIDEO') {
          text = videoUploadErrorText(err);
        } else {
          text = err?.message || tNow('selfInspection.error.uploadFailed', { noun: noun(kind) });
        }
        setMsg(key, { kind: 'error', text });
        return false;
      } finally {
        setUploading(u => ({ ...u, [key]: false }));
        setUploadProgress(p => {
          if (!p[key]) return p;
          const next = { ...p };
          delete next[key];
          return next;
        });
      }
    },
    [clearRetake, inspectionId, isM1, mediaFiles, retake, record, forgetAsset, removeInBackground, setMsg, suggestDamage, watchIntegrity],
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
    async (note, evidence, scanFile) => {
      const ok = await record('A1', { severity: 'OK', note });
      if (ok && evidence) {
        // vinEvidence(): { vin, engineNumber }
        setIdentity(s => ({ ...s, vin: evidence.vin ?? null, engine: evidence.engineNumber ?? null }));
      }
      if (ok && scanFile) keepScanPhoto('A1', scanFile);
      return ok;
    },
    [keepScanPhoto, record],
  );

  // A self-inspection's RC and chassis reads against the registry, to warn the user while
  // they can still fix a wrong photo. Only ever a warning: a bad read mustn't strand a
  // genuine car, and QC checks the same thing from the saved notes. A failed check leaves
  // the plate-against-RC comparison in place, as the user can't act on a network problem.
  const rcNote = local.P1?.note ?? '';
  const vinNote = local.A1?.note ?? '';
  useEffect(() => {
    if (screen !== 'ready' || !isM1) return;
    const reads = selfIdentityReads(rcNote, vinNote);
    const run = ++identityRun.current;
    setIdentityVerdicts(null);
    if (!reads.vin && !reads.registrationNumber) return;
    verifyInspectionIdentity(inspectionId, {
      vin: reads.vin,
      engineNumber: reads.engineNumber,
      frontPlate: reads.registrationNumber,
    }).then(
      verdicts => {
        if (run === identityRun.current) setIdentityVerdicts(verdicts);
      },
      () => {},
    );
  }, [screen, isM1, inspectionId, rcNote, vinNote]);

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
        const isScanPhoto = scanPhotoTest(allItems, inspection?.mode);
        const media = (await listSelfInspectionMedia(inspectionId)).filter(mv => !isScanPhoto(mv));
        setIntegrityItems(integrityReasonsFor(media));
      } catch {
        // keep the general retake message
      }
    }
    setScreen('submitted');
  }, [allItems, inspection?.mode, inspectionId]);

  const submitting$ = useRef(false);
  const submit = useCallback(async () => {
    // A fast double tap sends it (and opens the payment) only once.
    if (submitting$.current) return;
    submitting$.current = true;
    setSubmitting(true);
    setSubmitError('');
    setPayProblem(null);
    // Answers still being typed are saved before the server checks them.
    await flushTyped();
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
        setPayProblem({ kind: 'awaiting', messageKey: 'selfInspection.pay.awaiting' });
      } else if (paid.result === 'unavailable') {
        setPayProblem({ kind: 'unavailable', messageKey: 'selfInspection.pay.unavailable' });
      } else {
        setPayProblem({ kind: paid.kind ?? 'failed', message: paid.error || tNow('selfInspection.pay.failed') });
      }
    } finally {
      setPayPhase(null);
      setSubmitting(false);
      submitting$.current = false;
    }
  }, [allItems, inspectionId, runSubmit, flushTyped]);

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
  // Owners come from the official RC record whenever it has a count; the owner
  // only types them when it hasn't (as the web). O2 asks for PREVIOUS owners;
  // the valuation counts owners in total.
  const registryOwners = inspectionVehicle?.registry_owner_count;
  const registryPrevOwners = previousOwnersFromRegistry(registryOwners);
  const ownerCount = has('O2') ? registryOwners ?? totalOwnersFromPrevious(numericOf('O2')) : null;
  const previousOwners = has('O2') ? numericOf('O2') : null;

  // The RC's owner count is saved as the O2 answer, so the required item is
  // done without asking. Again only if the saved answer differs.
  const ownersSynced = useRef(null);
  useEffect(() => {
    if (!isM1 || screen !== 'ready' || registryPrevOwners == null || !has('O2')) return;
    const want = String(registryPrevOwners);
    const cur = localRef.current.O2;
    if ((cur?.saved && cur.num === want) || ownersSynced.current === want) return;
    ownersSynced.current = want;
    record('O2', { num: want, severity: 'OK', naReason: '' });
  });

  // After QC approval the value is settled: show the saved one, and say so if QC's review
  // changed it. A new estimate would cost money and could differ from the report.
  useEffect(() => {
    if (screen !== 'submitted' || !approved) return;
    setFinal({ loading: true, card: null, valuation: null, note: '', error: '' });
    getInspectionReport(inspectionId)
      .then(report =>
        setFinal({
          loading: false,
          card: report.valuationCard,
          valuation: report.valuation,
          note: report.valuationReason ?? '',
          error: '',
          adjusted: report.valuationAdjusted,
        }),
      )
      .catch(e =>
        setFinal({ loading: false, card: null, valuation: null, note: '', error: e?.message || tNow('selfInspection.error.finalFailed') }),
      );
  }, [screen, approved, inspectionId]);

  // An inspector's inspection: the visual condition from the AI photo readings and the
  // answers (the web's assessCondition), sent with the final value and shown on review.
  // A self-inspection's is worked out on the server from what's stored.
  const condition = useMemo(() => {
    if (!inspection || isM1) return null;
    const failed = Object.keys(analysis).filter(shot => analysis[shot] === 'failed');
    return summarizeCondition({
      cosmetics: Object.entries(persisted).flatMap(([shotCode, p]) =>
        (p.finding?.cosmetic ?? []).map(c => ({ shotCode, area: c.area, observation: c.observation, severity: c.severity })),
      ),
      answers: allItems.flatMap(item => {
        const st = local[item.item_code];
        return st?.saved && st.severity ? [{ itemCode: item.item_code, severity: st.severity }] : [];
      }),
      photographedShots: mediaShots.B1 ?? [],
      expectedShots: allItems.find(item => item.item_code === 'B1')?.evidence_requirement?.shot_codes ?? [],
      failedShots: failed,
    });
  }, [allItems, analysis, inspection, isM1, local, mediaShots, persisted]);
  const conditionLevel = condition?.level ?? null;

  // The final estimated value after submit: one backend request per input set.
  useEffect(() => {
    if (screen !== 'submitted' || approved || finalStatus === 'INTEGRITY_FAILED' || !vehicleId) return;
    const fetchKey = JSON.stringify([inspectionId, odometerKm, ownerCount, conditionLevel]);
    if (finalFetchRef.current === fetchKey) return;
    finalFetchRef.current = fetchKey;
    setFinal({ loading: true, card: null, valuation: null, note: '', error: '' });
    estimateFinalValue(
      buildFinalValuationRequest({ vehicleId, inspectionId, odometerKm, ownerCount, declaredCondition: conditionLevel }),
    )
      .then(res => setFinal({ loading: false, card: res.card, valuation: res.valuation, note: res.reason ?? '', error: '' }))
      .catch(e =>
        setFinal({ loading: false, card: null, valuation: null, note: '', error: e?.message || tNow('selfInspection.error.finalFailed') }),
      );
  }, [screen, approved, finalStatus, inspectionId, vehicleId, odometerKm, ownerCount, conditionLevel]);

  const derived = useMemo(() => {
    // Follow-up questions (show_if) count only once their question has a matching
    // saved answer, as the server's submit rule.
    const activeItems = activeItemsFor(allItems, local);
    const partition = partitionItems(activeItems);
    const groups = photoSections(photoGroups(allItems));
    const slots = photoSlots(allItems);
    const progress = buildProgress(activeItems, local, mediaShots);
    const missing = buildMissingList({
      items: activeItems,
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
      previousOwners,
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
      // The owner's notes carry the reads (plus the server's verdicts); the inspector's
      // reads are the confirmed RC / VIN values, checked against the vehicle (as the web).
      identityMismatch: isM1
        ? selfIdentityMismatchFields(selfIdentityReads(rcNote, vinNote), identityVerdicts)
        : inspectorMismatchFields(crossCheck),
    };
  }, [allItems, local, mediaShots, mediaCount, inspectionVehicle, identity, identityVerdicts, isM1, odometerKm, previousOwners, persisted, rcNote, vinNote]);

  return {
    screen,
    reload: load,
    inspection,
    sections,
    allItems,
    local,
    updateLocal,
    record,
    typeAnswer,
    mediaFiles,
    mediaShots,
    thumbs,
    uploading,
    uploadProgress,
    removing,
    slotMsg,
    // A note under one photo / document (e.g. the picker couldn't open).
    showMsg: setMsg,
    lastUpload,
    addEvidence,
    deleteShot,
    persisted,
    analysis,
    aiVerdictSaved,
    confirmRc,
    confirmVin,
    keepScanPhoto,
    submitting,
    payPhase,
    submit,
    submitError,
    payProblem,
    reopening,
    fixPhotos,
    finalStatus,
    integrityItems,
    // Photos the photo check flagged that still need taking again ([{ code, shotCode }]).
    retakeShots: Object.values(retake),
    final,
    // An inspector's inspection: { level, evidence, unknowns } (null on a self-inspection).
    condition,
    liveEstimateMinor,
    // Previous owners from the RC record (null: the owner types them).
    // Shown (and saved) as the owner count only in the owner's flow: the inspector types it.
    registryPrevOwners: isM1 ? registryPrevOwners : null,
    ...derived,
  };
}
