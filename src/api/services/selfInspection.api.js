// Self-inspection (M1) API, as the web's /inspect/[id] page uses it. The
// screen keeps the backend's own shapes (InspectionView, ChecklistItemSpec,
// MediaView) so the web's logic (src/vendor/selfInspectionLogic.js) runs on
// them unchanged.
import { request } from '../client';
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
// which isn't answered as a condition.
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
        it => (it.applicable_modes ?? []).includes(inspection.mode) && !(it.gate && it.evidence_requirement?.shots),
      ),
    }))
    .filter(s => s.items.length > 0);
  return { inspection, sections, media: media.items ?? [] };
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
export const uploadSelfEvidence = ({ inspectionId, itemCode, shotCode, kind, file, gps }) =>
  uploadInspectionFile({ inspectionId, itemCode, shotCode, kind, file, gps });

export const deleteSelfMedia = mediaId => deleteInspectionFile(mediaId);

// Persists the AI damage finding against its walkaround photo (advisory only).
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
export const submitSelfInspection = inspectionId => submitInspection(inspectionId);

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
