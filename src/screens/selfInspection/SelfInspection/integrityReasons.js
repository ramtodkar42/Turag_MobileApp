import { describeMediaIntegrity } from '../../../vendor/selfInspectionLogic';
import { itemName, shotName } from './labels';

// Why a file failed the server's photo check, as the web says it (integrity-reasons):
// an exact copy, a photo already used in another inspection, a screenshot - or, for
// anything else, "couldn't be verified". The first known failed signal decides.
const REASON_KEYS = {
  exact_duplicate: {
    PHOTO: 'selfInspection.integrity.copyPhoto',
    DOCUMENT: 'selfInspection.integrity.copyDocument',
    OTHER: 'selfInspection.integrity.copyFile',
  },
  perceptual_hash_near_duplicate: 'selfInspection.integrity.usedElsewhere',
  screenshot_detection: 'selfInspection.integrity.screenshot',
};
const UNVERIFIED_KEY = 'selfInspection.submitted.retakeItem';

export const integrityReasonKey = mv => {
  for (const signal of describeMediaIntegrity(mv).failKeys) {
    const entry = REASON_KEYS[signal];
    if (typeof entry === 'string') return entry;
    if (entry) return entry[mv.kind] ?? entry.OTHER;
  }
  return UNVERIFIED_KEY;
};

// Each failed file of an inspection: [{ id, code, shotCode, key }].
export const integrityReasonsFor = media =>
  media
    .filter(mv => describeMediaIntegrity(mv).failed)
    .map(mv => ({ id: mv.id, code: mv.item_code, shotCode: mv.shot_code, key: integrityReasonKey(mv) }));

// The failed files as lines to show, one per file ("The Body panel condition
// (Front) is an exact copy of another photo..."), without repeats.
export const integrityReasonLines = (t, reasons, allItems) => {
  const seen = new Set();
  const lines = [];
  reasons.forEach(r => {
    const item = itemName(t, allItems.find(i => i.item_code === r.code)) || r.code;
    const shot = r.shotCode && r.shotCode !== r.code ? shotName(t, r.shotCode) : null;
    const name = shot && shot !== r.shotCode ? `${item} (${shot})` : item;
    const text = t(r.key, { name });
    if (seen.has(text)) return;
    seen.add(text);
    lines.push({ id: r.id ?? text, text });
  });
  return lines;
};
