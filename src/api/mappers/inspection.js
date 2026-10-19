// Backend inspector data -> the shapes the inspector screens use: jobs (the
// booking queue), the checklist for one inspection, the inspection's saved
// answers and its uploaded photos.
import { mapBooking } from './booking';
import { toRupees } from './money';

// Statuses the inspector still works on (the rest are history).
const TO_DO = new Set(['ASSIGNED', 'ON_SITE']);

// GET /inspection-bookings/queue item -> job. inspectionId set = started.
export const mapJob = b => ({ ...mapBooking(b), toDo: TO_DO.has(b.status) });

// The guided-photo matrices (XM1 self-inspection, XM2 inspector): not a
// checklist step (the web hides them too).
const HIDDEN_ITEMS = new Set(['XM1', 'XM2']);

// Items where EVERY listed angle needs a photo: the body-panel walk-around
// (Front, Front-left, ... Front-right). The backend's checklist says
// "at least 1" while its all-angles rule is temporarily relaxed; the app
// asks for all of them.
const ALL_SHOTS_REQUIRED = new Set(['B1']);

// ChecklistDefinition -> the items that apply to `mode`, in order:
// [{ code, label, group, groupLabel, answerType ('STATE' | 'NUMERIC' | 'BOOL'),
//    mandatory, scored, escalates (cost / note needed for worse damage),
//    evidence: { kind ('PHOTO' | 'DOCUMENT'), minCount, shotCodes, allShots } | null }]
// allShots: every shot code needs a photo (minCount = the number of shots).
export const mapChecklist = (definition, mode) =>
  (definition?.sections ?? []).flatMap(section =>
    (section.items ?? [])
      .filter(item => !HIDDEN_ITEMS.has(item.item_code))
      .filter(item => !item.applicable_modes?.length || item.applicable_modes.includes(mode))
      .map(item => {
        const evidence = item.evidence_requirement;
        const shotCodes = evidence?.shot_codes?.length ? evidence.shot_codes : [item.item_code];
        const allShots = ALL_SHOTS_REQUIRED.has(item.item_code) && shotCodes.length > 1;
        return {
          code: item.item_code,
          label: item.label,
          group: item.group_code ?? section.group_code,
          groupLabel: section.label,
          answerType: item.answer_type ?? 'STATE',
          mandatory: !!item.mandatory,
          scored: item.scored !== false,
          escalates: !!evidence?.severity_escalation,
          evidence: evidence
            ? {
                kind: evidence.kinds?.includes('DOCUMENT') ? 'DOCUMENT' : evidence.kinds?.[0] ?? 'PHOTO',
                minCount: allShots ? shotCodes.length : evidence.min_count ?? 0,
                shotCodes,
                allShots,
              }
            : null,
        };
      }),
  );

// InspectionView -> { id, status, mode, category, checklistVersion, vehicle,
//   answers: { [itemCode]: { severity, numericValue, note, naReason, refurbCost (₹) } } }
export const mapInspection = view => ({
  id: view.id,
  status: view.status,
  mode: view.mode,
  category: view.category,
  checklistVersion: view.checklist_version,
  vehicle: view.vehicle
    ? { make: view.vehicle.make, model: view.vehicle.model, year: view.vehicle.mfg_year }
    : null,
  answers: Object.fromEntries(
    (view.items ?? []).map(item => [
      item.item_code,
      {
        severity: item.severity,
        numericValue: item.numeric_value ?? null,
        note: item.text_note ?? null,
        naReason: item.na_reason ?? null,
        refurbCost: toRupees(item.refurb_cost_minor),
      },
    ]),
  ),
});

// Media the backend counts as evidence (the web treats these as usable).
const USABLE = new Set(['UPLOADED', 'PROCESSING', 'PROCESSED', 'INTEGRITY_FLAGGED', 'REDACTION_HELD']);

// GET /inspections/{id}/media items -> { [itemCode]: [shotCode, ...] } (usable only).
// Uploaded file ids per shot: { 'itemCode|shotCode': [mediaId] } - what a
// retake replaces (and deletes) when the photo was taken in an earlier visit.
export const mapShotMedia = items => {
  const ids = {};
  (items ?? []).forEach(media => {
    if (media.id && USABLE.has(media.status)) {
      (ids[`${media.item_code}|${media.shot_code}`] ??= []).push(media.id);
    }
  });
  return ids;
};

export const mapCapturedShots = items => {
  const shots = {};
  (items ?? []).forEach(media => {
    if (USABLE.has(media.status)) {
      (shots[media.item_code] ??= []).push(media.shot_code);
    }
  });
  return shots;
};
