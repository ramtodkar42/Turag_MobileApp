import { fileType, PAYOUT_PROOF_MAX_BYTES, PAYOUT_PROOF_TYPES } from '../../../api/services/payout.api';
import { pickImageFromGallery, takePhoto } from '../../../utils/pickImage';
import { pickPdf } from '../../../utils/pickDocument';
import { tNow } from '../../../i18n';

// Let a bottom sheet finish closing before the camera / gallery / file picker opens.
export const AFTER_SHEET_MS = 350;

// The choices in the "Add your proof" sheet.
export const proofSources = t => [
  { value: 'camera', label: t('verify.source.camera') },
  { value: 'gallery', label: t('verify.source.gallery') },
  { value: 'pdf', label: t('selfInspection.source.pdf') },
];

// Opens the camera / gallery / PDF picker and returns the chosen file, or null
// if cancelled. Throws an Error with a message for the user when the file
// can't be used (the server checks type and size again).
export const pickProofFile = async source => {
  let file;
  try {
    file = source === 'pdf' ? await pickPdf() : source === 'camera' ? await takePhoto() : await pickImageFromGallery();
  } catch (e) {
    throw new Error(e?.message === 'camera_permission' ? tNow('verify.error.camera') : tNow('payouts.proof.pickError'));
  }
  if (!file) return null;
  const type = fileType(file);
  if (type && !PAYOUT_PROOF_TYPES.has(type)) {
    throw new Error(tNow('payouts.form.badType'));
  }
  if ((file.fileSize ?? 0) > PAYOUT_PROOF_MAX_BYTES) {
    throw new Error(tNow('payouts.form.tooLarge'));
  }
  return file;
};
