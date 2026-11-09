// Self-inspection (M1) API, as the web's /inspect/[id] page uses it. The
// screen keeps the backend's own shapes (InspectionView, ChecklistItemSpec,
// MediaView) so the web's logic (src/vendor/selfInspectionLogic.js) runs on
// them unchanged.
import { newIdempotencyKey, request } from '../client';
import { PAYMENT_CANCELLED, isTestGateway, openRazorpayCheckout } from '../razorpay';
import { openHostedCheckout } from '../hostedCheckout';
import { tNow } from '../../i18n';
import { ENDPOINTS } from '../endpoints';
import { UPLOAD_TIMEOUT_MS } from '../config';
import { mapValuation } from '../mappers/valuation';
import { mediaUrl } from '../../utils/mediaUrl';
import { selectFinalValuationCard } from '../../vendor/selfInspectionLogic';
import { deleteInspectionFile, submitInspection, uploadInspectionFile } from './valuation.api';

// Media the web treats as captured evidence.
export const USABLE_MEDIA = new Set(['UPLOADED', 'PROCESSING', 'PROCESSED', 'INTEGRITY_FLAGGED', 'REDACTION_HELD']);

// The inspection, its checklist sections for its mode and its media.
// Hidden as on the web: a gate item carrying a full `shots` matrix (e.g. XM1),
// which isn't answered as a condition, and the questions only QC answers in this
// mode (chassis, pillars, modifications, theft marker): the server refuses them here.
// Returns { inspection, sections: [{ group_code, label, items }], media }.
export const getSelfInspection = async inspectionId => {
  const { inspection } = await request(ENDPOINTS.inspection(inspectionId));
  const [checklist, media] = await Promise.all([
    request(ENDPOINTS.checklist(inspection.category, inspection.checklist_version)),
    request(ENDPOINTS.inspectionMedia(inspectionId)),
  ]);
  const sections = (checklist.checklist?.sections ?? [])
    .map(s => ({
      group_code: s.group_code,
      label: s.label,
      items: (s.items ?? []).filter(
        it =>
          (it.applicable_modes ?? []).includes(inspection.mode) &&
          !it.qc_answered_modes?.includes(inspection.mode) &&
          !(it.gate && it.evidence_requirement?.shots),
      ),
    }))
    .filter(s => s.items.length > 0);
  return { inspection, sections, media: media.items ?? [] };
};

// The valuation the owner saw before starting this inspection (from Evaluate),
// shown as the live estimate so they see one consistent number. Paise, or null
// when the vehicle has none yet (e.g. it came through "List a vehicle").
export const getReferenceValuation = async inspectionId => {
  const data = await request(ENDPOINTS.inspectionReferenceValuation(inspectionId));
  return data?.valuation?.value_minor ?? null;
};

// The inspection's media again (after submit: the integrity reasons).
export const listSelfInspectionMedia = async inspectionId =>
  (await request(ENDPOINTS.inspectionMedia(inspectionId))).items ?? [];

// Saves one answer with the web's body: { severity, text_note?, refurb_cost_minor?,
// numeric_value?, na_reason?, inspector_override?, ml_suggestion? }.
export const recordSelfAnswer = (inspectionId, itemCode, body) =>
  request(ENDPOINTS.inspectionItem(inspectionId, itemCode), { method: 'PUT', body });

// One evidence file for an (item, shot): kind 'PHOTO' | 'DOCUMENT' | 'VIDEO'.
// Exact duplicates are refused before uploading (DUPLICATE_FILE).
// gps (optional): { lat, lng, accuracyM? }. Returns { mediaId, status }.
// onProgress({ stage: 'preparing' | 'uploading' | 'finishing', fraction? }): see uploadInspectionFile.
export const uploadSelfEvidence = ({ inspectionId, itemCode, shotCode, kind, file, gps, onProgress }) =>
  uploadInspectionFile({ inspectionId, itemCode, shotCode, kind, file, gps, onProgress });

export const deleteSelfMedia = mediaId => deleteInspectionFile(mediaId);

// Self-inspection: the server reads a stored photo itself (walkaround damage, tyre
// tread, VIN and odometer scans) and saves the result. The app sends neither the image
// nor the result. Safe to repeat: a photo already read isn't charged again. Returns the
// media row (a walkaround photo's finding is its ai_finding); a failed read throws, and
// the photo then counts as "could not assess", which never holds the user up.
export const analyzeMedia = async mediaId => {
  const data = await request(ENDPOINTS.mediaAnalyze(mediaId), { method: 'POST', timeoutMs: UPLOAD_TIMEOUT_MS });
  return data?.media ?? null;
};

// Self-inspection, after the engine clip uploads: up to 10 stills from it (JPEG data
// URLs). The server's worker hides plates and faces before any AI sees them; the result
// is for QC only, so nothing comes back.
export const submitEngineFrames = (inspectionId, frames) =>
  request(ENDPOINTS.inspectionEngineFrames(inspectionId), { method: 'POST', body: { frames }, timeoutMs: UPLOAD_TIMEOUT_MS });

// Self-inspection: the engine's idle as measured on the phone ({ durationSec,
// loudnessDbfs, stabilityCv, transientsPerSec }), or null when it couldn't be measured.
// For QC only, labelled unverified.
export const reportEngineSound = (inspectionId, signals) =>
  request(ENDPOINTS.inspectionEngineSound(inspectionId), {
    method: 'POST',
    body: {
      audio: signals
        ? {
            duration_sec: signals.durationSec,
            loudness_dbfs: signals.loudnessDbfs,
            stability_cv: signals.stabilityCv,
            transients_per_sec: signals.transientsPerSec,
          }
        : null,
    },
  });

// The inspector's inspection only: persists the AI damage finding against its
// walkaround photo (advisory only). The server refuses this on a self-inspection.
export const saveAiFinding = (mediaId, finding) =>
  request(`/media/${encodeURIComponent(mediaId)}/ai-finding`, {
    method: 'POST',
    body: { finding },
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });

// A signed thumbnail for a photo uploaded earlier (null when not ready).
export const getThumbUrl = async mediaId => {
  const data = await request(`/media/${encodeURIComponent(mediaId)}/derivative?variant=THUMB`);
  return mediaUrl(data?.url);
};

// Submits. Returns { status } ('PENDING_QC' / 'SUBMITTED' ..., or 'INTEGRITY_FAILED').
// When the self-inspection fee is on and unpaid, the server refuses with 402
// SELF_INSPECTION_FEE_REQUIRED: pay (payForSelfInspection), then submit again.
export const submitSelfInspection = inspectionId => submitInspection(inspectionId);

export const SELF_INSPECTION_FEE_REQUIRED = 'SELF_INSPECTION_FEE_REQUIRED';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Pays the self-inspection fee (as the web's payForSelfInspection). The amount
// is the server's. The test gateway completes it with /pay/simulate, a real one
// opens Razorpay, a redirect provider (PhonePe) opens its page in a secure tab;
// then the payment is checked (1 s apart, 10 times) until the server confirms
// it - the app never decides it's paid. onPhase('starting' | 'confirming') for
// the button text. opts.prefill: { name, email, contact } for the checkout.
// Returns { result: 'paid' | 'awaiting' (not confirmed yet) | 'failed' |
// 'unavailable' (payments off), amountMinor, error? }.
export const payForSelfInspection = async (inspectionId, { onPhase, prefill } = {}) => {
  onPhase?.('starting');
  let payment;
  try {
    ({ payment } = await request(ENDPOINTS.inspectionPay(inspectionId), {
      method: 'POST',
      body: {},
      headers: { 'Idempotency-Key': newIdempotencyKey() },
    }));
  } catch (e) {
    if (e?.code === 'PAYMENTS_UNAVAILABLE' || e?.status === 503) {
      return { result: 'unavailable', amountMinor: null };
    }
    return { result: 'failed', amountMinor: null, error: e?.message };
  }
  const amountMinor = payment.amount?.amount_minor ?? null;
  onPhase?.('confirming');

  if (payment.redirect_url) {
    // PhonePe (hosted checkout): its page in a secure browser tab; the payment
    // is then checked below (confirmed by the server's webhook).
    await openHostedCheckout(payment.redirect_url);
  } else if (isTestGateway(payment)) {
    try {
      await request(ENDPOINTS.inspectionPaySimulate(inspectionId), { method: 'POST', body: {} });
    } catch {
      return { result: 'awaiting', amountMinor };
    }
  } else {
    try {
      await openRazorpayCheckout({
        keyId: payment.key_id,
        orderId: payment.provider_order_id,
        amountMinor,
        description: tNow('selfInspection.pay.description'),
        prefill,
      });
    } catch (e) {
      if (e?.code === PAYMENT_CANCELLED) {
        // Closed by the payer: "tap Submit to pay"; declined / no internet:
        // the checkout's own words (api/razorpay).
        const kind = e.details?.kind ?? 'cancelled';
        return {
          result: 'failed',
          amountMinor,
          kind,
          error: kind === 'cancelled' ? tNow('selfInspection.pay.cancelled') : e.message,
        };
      }
      return { result: 'awaiting', amountMinor };
    }
  }
  for (let i = 0; i < 10; i += 1) {
    await wait(1000);
    const status = await request(ENDPOINTS.payment(payment.payment_id))
      .then(d => d.payment?.status ?? null)
      .catch(() => null);
    if (status === 'CAPTURED') return { result: 'paid', amountMinor };
    if (status === 'FAILED' || status === 'EXPIRED') return { result: 'failed', amountMinor };
  }
  return { result: 'awaiting', amountMinor };
};

// INTEGRITY_FAILED -> IN_PROGRESS, to retake the flagged photos.
export const reopenSelfInspection = inspectionId =>
  request(ENDPOINTS.inspectionReopen(inspectionId), { method: 'POST' });

// The final estimated value after submit (the web's buildFinalValuationRequest
// body). Returns { card: { valueMinor, confidenceLevel } | null, valuation
// (the app's valuation shape, for saving to the Garage) | null, reason }.
export const estimateFinalValue = async body => {
  const res = await request(ENDPOINTS.VALUATION_ESTIMATE, { method: 'POST', body, timeoutMs: 45000 });
  return {
    card: selectFinalValuationCard(res),
    valuation: res.status === 'READY' && res.valuation ? mapValuation(res.valuation) : null,
    reason: res.status === 'NOT_READY' ? res.reason ?? null : null,
  };
};
