import { useRef, useState } from 'react';
import { submitVerification } from '../../../api/services/verification.api';
import { pickImageFromGallery, takePhoto } from '../../../utils/pickImage';
import { tNow } from '../../../i18n';
import { compact, documentOf } from './documents';

// Let a bottom sheet finish closing before the camera / gallery opens over it.
const AFTER_SHEET_MS = 350;

// The identity form (as the web's VerificationForm): the document type, its
// number, a selfie and a photo of the document, and consent. submit() sends it
// and calls onDone(verification). Changing the document type clears the number.
export default function useVerifyIdentity({ onDone }) {
  const [docType, setDocType] = useState('AADHAAR');
  const [number, setNumber] = useState('');
  const [selfie, setSelfie] = useState(null);
  const [docImage, setDocImage] = useState(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const sending = useRef(false);

  const doc = documentOf(docType);
  const numberOk = doc.valid(compact(number));
  const canSubmit = !!selfie && !!docImage && consent && numberOk && !submitting;

  const chooseDocType = type => {
    if (type === docType) return;
    setDocType(type);
    setNumber('');
  };

  const changeNumber = text => setNumber(doc.format(text));

  // source: 'camera' | 'gallery'. The selfie uses the front camera.
  const pick = (set, { front, fromSheet }) => source =>
    setTimeout(
      async () => {
        setPhotoError('');
        try {
          const photo = source === 'camera' ? await takePhoto({ front }) : await pickImageFromGallery();
          if (photo) set(photo);
        } catch (e) {
          setPhotoError(
            e?.message === 'camera_permission' ? tNow('verify.error.camera') : tNow('verify.error.photo'),
          );
        }
      },
      fromSheet ? AFTER_SHEET_MS : 0,
    );

  const submit = async () => {
    if (!canSubmit || sending.current) return;
    sending.current = true;
    setSubmitting(true);
    setError('');
    try {
      const verification = await submitVerification({ docType, docNumber: number, selfie, docImage });
      onDone?.(verification);
    } catch (e) {
      setError(e?.message || tNow('verify.error.submit'));
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  };

  return {
    doc,
    docType,
    chooseDocType,
    number,
    changeNumber,
    numberOk,
    selfie,
    setSelfie,
    pickSelfie: pick(setSelfie, { front: true }),
    docImage,
    setDocImage,
    pickDocImage: pick(setDocImage, { front: false, fromSheet: true }),
    consent,
    toggleConsent: () => setConsent(c => !c),
    canSubmit,
    submitting,
    submit,
    error,
    photoError,
  };
}
