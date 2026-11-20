// Self-inspection (M1) API, as the web's /inspect/[id] page uses it. The
// screen keeps the backend's own shapes (InspectionView, ChecklistItemSpec,
// MediaView) so the web's logic (src/vendor/selfInspectionLogic.js) runs on
// them unchanged.
import { newIdempotencyKey, request } from '../client';
import { PAYMENT_CANCELLED, isTestGateway, openRazorpayCheckout } from '../razorpay';
import { openHostedCheckout } from '../hostedCheckout';
import { tNow } from '../../i18n';
import { ENDPOINTS } from '../endpoints';
import { PLAY_BILLING, UPLOAD_TIMEOUT_MS } from '../config';
import {
  PLAY_ALREADY_OWNED,
  PLAY_CANCELLED,
  PLAY_UNAVAILABLE,
  buyPlayProduct,
  consumePlayPurchase,
  getPlayPurchases,
} from '../playBilling';
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

// Pays the self-inspection fee. Android: Google Play Billing (payWithGooglePlay).
// Elsewhere: the payment gateway, as the web (payWithGateway). The app never
// decides it's paid; only the server's CAPTURED counts.
// onPhase('starting' | 'confirming') for the button text. opts: { onPhase,
// prefill: { name, email, contact } (gateway checkout), accountId (the Turag
// user id, sent with a Google Play purchase) }.
// Returns { result: 'paid' | 'awaiting' (not confirmed yet) | 'pending' (Google
// Play: the payment itself isn't complete yet) | 'failed' | 'unavailable',
// amountMinor, kind?, messageKey?, error? }.
export const payForSelfInspection = (inspectionId, opts = {}) =>
  PLAY_BILLING.enabled ? payWithGooglePlay(inspectionId, opts) : payWithGateway(inspectionId, opts);

// --- Google Play Billing (Android) ----------------------------------------------------
// Google's sheet takes the money; the purchase token then goes to the server, which
// checks it with Google and records the fee. The purchase is consumed only after the
// server has it, so a purchase made just before the app closed is sent again later
// (recoverPlayPurchases) and is never charged twice. A purchase the server refuses is
// not consumed either: Google refunds it after 3 days when it isn't acknowledged.

const PLAY_VERIFY_TIMEOUT_MS = 30000;

// Server answers that mean "this purchase can't be used for this inspection".
const PLAY_REFUSED = new Set(['STORE_PURCHASE_INVALID', 'PAYMENT_CONFLICT_STATE', 'PAYMENT_NOT_FOUND', 'VALIDATION_ERROR']);

// The inspection's fee was already paid another way (e.g. Razorpay on the web): the
// server refuses this purchase without recording it. The inspection counts as paid,
// and the purchase is left unfinished so Google refunds it.
const FEE_ALREADY_PAID = 'FEE_ALREADY_PAID';
// Purchases the server answered that way in this app session: not sent again.
const alreadyPaidTokens = new Set();

// Sends one purchase to the server for `inspectionId`; consumes it once the server
// has recorded the fee. Returns the same shape as payForSelfInspection, plus
// alreadyPaid: true when the fee had been paid another way.
export const settlePlayPurchase = async (inspectionId, purchase) => {
  let payment;
  try {
    ({ payment } = await request(ENDPOINTS.inspectionPayGooglePlay(inspectionId), {
      method: 'POST',
      body: { product_id: PLAY_BILLING.selfInspectionProductId, purchase_token: purchase.token },
      timeoutMs: PLAY_VERIFY_TIMEOUT_MS,
    }));
  } catch (e) {
    if (e?.code === FEE_ALREADY_PAID) {
      alreadyPaidTokens.add(purchase.token);
      return { result: 'paid', amountMinor: null, alreadyPaid: true };
    }
    if (e?.code === 'PAYMENTS_UNAVAILABLE') {
      return { result: 'unavailable', amountMinor: null, messageKey: 'selfInspection.pay.unavailable' };
    }
    if (PLAY_REFUSED.has(e?.code)) {
      return { result: 'failed', kind: 'failed', amountMinor: null, messageKey: 'selfInspection.pay.playRefused' };
    }
    // No connection, or Google's check is down: the purchase stays and is sent again.
    return { result: 'awaiting', amountMinor: null };
  }
  const amountMinor = payment?.amount?.amount_minor ?? null;
  if (payment?.status !== 'CAPTURED') {
    return { result: 'awaiting', amountMinor };
  }
  if (!purchase.stub) {
    // Not fatal: the fee is recorded; an unconsumed purchase is finished next time.
    await consumePlayPurchase(purchase.token).catch(() => {});
  }
  return { result: 'paid', amountMinor };
};

const isFeePurchase = purchase => purchase?.products?.includes(PLAY_BILLING.selfInspectionProductId);

// A purchase of the fee for this inspection that the server doesn't have yet, if any.
const ownedPurchaseFor = async inspectionId => {
  try {
    return (await getPlayPurchases()).find(p => isFeePurchase(p) && p.profileId === inspectionId) ?? null;
  } catch {
    return null;
  }
};

// Purchases bought but not recorded yet (the app closed before the server had one,
// or a pending payment went through later): each is sent for its own inspection.
// Never buys anything. Resolves the number recorded now.
let recovering = null;
export const recoverPlayPurchases = () => {
  recovering ??= (async () => {
    let recorded = 0;
    try {
      const owned = (await getPlayPurchases()).filter(
        p => isFeePurchase(p) && p.state === 'purchased' && p.profileId && !alreadyPaidTokens.has(p.token),
      );
      for (const purchase of owned) {
        if ((await settlePlayPurchase(purchase.profileId, purchase)).result === 'paid') {
          recorded += 1;
        }
      }
    } catch {
      // Google Play billing isn't available on this phone.
    }
    return recorded;
  })().finally(() => {
    recovering = null;
  });
  return recovering;
};

const payWithGooglePlay = async (inspectionId, { onPhase, accountId } = {}) => {
  onPhase?.('starting');
  // Already bought for this inspection (the app closed before the server had it, or
  // a pending payment went through): send that one, no second charge.
  const owned = await ownedPurchaseFor(inspectionId);
  if (owned?.state === 'pending') {
    return { result: 'pending', amountMinor: null, messageKey: 'selfInspection.pay.pending' };
  }
  if (owned?.state === 'purchased') {
    onPhase?.('confirming');
    return settlePlayPurchase(inspectionId, owned);
  }

  let purchase;
  try {
    purchase = await buyPlayProduct({
      productId: PLAY_BILLING.selfInspectionProductId,
      accountId,
      profileId: inspectionId,
    });
  } catch (e) {
    if (e?.code === PLAY_CANCELLED) {
      return { result: 'failed', kind: 'cancelled', amountMinor: null, messageKey: 'selfInspection.pay.cancelled' };
    }
    if (e?.code === PLAY_ALREADY_OWNED) {
      // An earlier purchase on this phone isn't finished yet: record what can be, then ask to try again.
      await recoverPlayPurchases();
      return { result: 'awaiting', amountMinor: null, messageKey: 'selfInspection.pay.playOwned' };
    }
    if (e?.code === PLAY_UNAVAILABLE && PLAY_BILLING.devStub) {
      // Debug build not installed from Google Play: the test server's stub check.
      purchase = { token: `gp_stub_${inspectionId}_${Date.now()}`, state: 'purchased', stub: true };
    } else if (e?.code === PLAY_UNAVAILABLE) {
      return { result: 'unavailable', amountMinor: null, messageKey: 'selfInspection.pay.playUnavailable' };
    } else if (e?.code === 'network') {
      return { result: 'failed', kind: 'network', amountMinor: null, messageKey: 'selfInspection.pay.playNetwork' };
    } else {
      return { result: 'failed', kind: 'failed', amountMinor: null, messageKey: 'selfInspection.pay.failed' };
    }
  }
  if (purchase.state === 'pending') {
    // e.g. paying with cash at a shop: Google tells the app when it goes through.
    return { result: 'pending', amountMinor: null, messageKey: 'selfInspection.pay.pending' };
  }
  if (purchase.state !== 'purchased') {
    return { result: 'failed', kind: 'failed', amountMinor: null, messageKey: 'selfInspection.pay.failed' };
  }
  onPhase?.('confirming');
  return settlePlayPurchase(inspectionId, purchase);
};

// --- Payment gateway (iPhone; the web's payForSelfInspection) --------------------------
// The amount is the server's. The test gateway completes it with /pay/simulate, a
// real one opens Razorpay, a redirect provider (PhonePe) opens its page in a secure
// tab; then the payment is checked (1 s apart, 10 times) until the server confirms it.
const payWithGateway = async (inspectionId, { onPhase, prefill } = {}) => {
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
// The server refuses a self-inspection's submit until its selfie + name are added.
export const PERFORMER_REQUIRED = 'PERFORMER_ATTESTATION_REQUIRED';

const mapPerformer = a => (a ? { name: a.performer_name, addedAt: a.created_at } : null);

// Who is doing this self-inspection (ADR-0104): { name, addedAt } once the
// selfie and name are added, else null. Only Turag's team reviewing the
// inspection sees the selfie (never the report or buyers).
export const getPerformer = async inspectionId => {
  const data = await request(ENDPOINTS.inspectionPerformer(inspectionId));
  return mapPerformer(data?.attestation);
};

// Adds the selfie (file: from takePhoto) and the name - or replaces them (the
// old ones are kept by the server). Returns { name, addedAt }.
export const savePerformer = async (inspectionId, { name, file }) => {
  const form = new FormData();
  form.append('performer_name', name);
  form.append('selfie', { uri: file.uri, type: file.type || 'image/jpeg', name: file.fileName || 'selfie.jpg' });
  const data = await request(ENDPOINTS.inspectionPerformer(inspectionId), {
    method: 'POST',
    body: form,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
  return mapPerformer(data?.attestation);
};

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
