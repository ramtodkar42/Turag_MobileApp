import { shotLabel } from '../../../vendor/selfInspectionLogic';

// Names on the self-inspection in the app's language. The web's texts are
// English, from the checklist config; known codes are translated here and
// anything new falls back to the web's own wording (so it's never blank).

const translated = (t, key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

// A photo angle / document, e.g. INT_GEAR_KNOB -> "Gear knob".
export const shotName = (t, code) => translated(t, `selfInspection.shot.${code}`, shotLabel(code));

// A checklist item, e.g. B1 -> "Body panel condition".
export const itemName = (t, item) =>
  item ? translated(t, `selfInspection.item.${item.item_code}`, item.label) : '';

// A checklist group heading, e.g. D -> "Engine & drivetrain".
export const groupName = (t, groupCode, label) => translated(t, `selfInspection.group.${groupCode}`, label);

// A "what's left" entry (buildMissingList gives English labels in fixed
// shapes) in the app's language.
export const missingLabel = (t, entry, items) => {
  const item = items.find(i => i.item_code === entry.itemCode);
  const name = itemName(t, item) || entry.label;
  const label = entry.label;
  if (entry.itemCode === 'P1' && label === 'RC details') return t('selfInspection.missing.rc');
  if (entry.itemCode === 'A1' && label === 'Chassis / VIN number') return t('selfInspection.missing.vin');
  if (entry.itemCode === 'O1' && label === 'Odometer reading') return t('selfInspection.missing.odometer');
  if (entry.itemCode === 'O2' && label === 'Number of previous owners') return t('selfInspection.missing.owners');
  if (label.startsWith('Add photos for ')) return t('selfInspection.missing.addPhotos', { name });
  if (label.startsWith('Add the ')) return t('selfInspection.missing.addVideo', { name });
  if (label.startsWith('Add a photo for ')) return t('selfInspection.missing.addPhoto', { name });
  if (label.startsWith('Upload ')) return t('selfInspection.missing.upload', { name });
  if (label.startsWith('Repair cost for ')) return t('selfInspection.missing.cost', { name });
  if (label.startsWith('Note for ')) return t('selfInspection.missing.note', { name });
  return name;
};
