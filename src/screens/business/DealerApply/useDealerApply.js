import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../api/client';
import {
  getMyDealerApplication,
  saveDealerApplication,
  submitDealerApplication,
  uploadDealerDocument,
} from '../../../api/services/dealerApplication.api';
import useRemoteData from '../../../hooks/useRemoteData';
import { getUser } from '../../../store/userStore';
import { pickImageFromGallery, takePhoto } from '../../../utils/pickImage';
import { pickPdf } from '../../../utils/pickDocument';
import { tNow } from '../../../i18n';
import { checkForm, formFrom, serverField } from './dealerApplyForm';

// Let the source sheet finish closing before the camera / picker opens.
const AFTER_SHEET_MS = 350;

// The message for a field the server refused (same wording as the form's own checks).
const fieldKey = (field, form) => {
  switch (field) {
    case 'email':
      return 'errors.email';
    case 'pinCode':
      return 'dealerApply.error.pinCode';
    case 'pan':
      return 'dealerApply.error.pan';
    case 'gstin':
      return 'dealerApply.error.gstin';
    case 'registrationNumber':
      return form.registrationType === 'UDYAM' ? 'dealerApply.error.udyam' : 'dealerApply.error.shopAct';
    case 'aadhaarNumber':
      return 'dealerApply.error.aadhaar';
    default:
      return 'dealerApply.error.required';
  }
};

// Anything else that went wrong, in plain words.
export const dealerApplyErrorText = e => {
  if (e?.code === 'DOCUMENT_TOO_LARGE' || e?.status === 413) return tNow('dealerApply.error.tooLarge');
  if (e?.code === 'DEALER_APPLICATION_UNAVAILABLE') return tNow('dealerApply.error.unavailable');
  if (e?.code === 'DEALER_GSTIN_IN_USE') return tNow('dealerApply.error.gstinInUse');
  if (e?.code === 'DEALER_APPLICATION_INVALID_ACTION') {
    switch (e.details?.reason) {
      case 'DOCUMENTS_MISSING':
        return tNow('dealerApply.error.documentsMissing');
      case 'DETAILS_INCOMPLETE':
        return tNow('dealerApply.error.detailsIncomplete');
      case 'ALREADY_A_DEALER':
        return tNow('dealerApply.error.alreadyDealer');
      default:
        return tNow('dealerApply.error.locked');
    }
  }
  if (e?.code === 'DEALER_APPLICATION_NOT_FOUND') return tNow('dealerApply.error.saveFirst');
  // No connection / timed out / server down: the client's own message says which.
  if (e instanceof ApiError && (e.isNetworkError || e.status >= 500 || e.status === 429) && e.message) return e.message;
  return tNow('dealerApply.error.generic');
};

// Become a dealer (ADR-0101): load the application, edit and save the details,
// upload each document (photo or PDF), submit for review.
// Returns { application, loading, refreshing, loadError, refresh, reload,
//   form, setField, fieldErrors, saving, saved, save(),
//   uploading (doc type | null), upload(docType, source 'camera' | 'gallery' | 'pdf'),
//   submitting, submit(), error ({ where: 'details' | 'docs' | 'submit', text } | null) }.
export default function useDealerApply() {
  const { data, setData, loading, refreshing, error: loadError, refresh, reload } = useRemoteData(
    () => getMyDealerApplication().then(application => ({ application })),
    [],
  );
  const application = data?.application ?? null;
  const [form, setForm] = useState(() => formFrom(null, getUser()));
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // What went wrong, next to the part it's about: { where: 'details' | 'docs' | 'submit', text } | null.
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  // The form is filled from the server once (later reloads keep what's typed).
  const filled = useRef(false);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!loading && !filled.current && data) {
      filled.current = true;
      setForm(formFrom(application, getUser()));
    }
  }, [loading, data, application]);

  const setField = useCallback(
    field => value => {
      setForm(prev => ({ ...prev, [field]: value }));
      setFieldErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
      setSaved(false);
    },
    [],
  );

  const update = next => setData({ application: next });

  const save = async () => {
    if (busy.current) return false;
    const { details, errors } = checkForm(form);
    setError(null);
    setSaved(false);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError({ where: 'details', text: tNow('dealerApply.error.checkFields') });
      return false;
    }
    busy.current = true;
    setSaving(true);
    setFieldErrors({});
    try {
      const next = await saveDealerApplication(details);
      if (!mounted.current) return false;
      update(next);
      // Shown as the server keeps them (codes in capitals); the Aadhaar is typed again next time.
      setForm({ ...formFrom(next, getUser()) });
      setSaved(true);
      return true;
    } catch (e) {
      if (!mounted.current) return false;
      const field = serverField(e);
      if (field) {
        setFieldErrors({ [field]: fieldKey(field, form) });
        setError({ where: 'details', text: tNow('dealerApply.error.checkFields') });
      } else {
        setError({ where: 'details', text: dealerApplyErrorText(e) });
      }
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const upload = (docType, source) => {
    if (busy.current || !application) return;
    busy.current = true;
    setError(null);
    setSaved(false);
    setTimeout(async () => {
      try {
        let file;
        try {
          file = source === 'pdf' ? await pickPdf() : source === 'camera' ? await takePhoto() : await pickImageFromGallery();
        } catch (e) {
          if (mounted.current) {
            setError({
              where: 'docs',
              text: e?.message === 'camera_permission' ? tNow('verify.error.camera') : tNow('dealerApply.error.pick'),
            });
          }
          return;
        }
        if (!file || !mounted.current) return;
        setUploading(docType);
        const next = await uploadDealerDocument(docType, file);
        if (mounted.current) update(next);
      } catch (e) {
        if (mounted.current) setError({ where: 'docs', text: dealerApplyErrorText(e) });
      } finally {
        busy.current = false;
        if (mounted.current) setUploading(null);
      }
    }, AFTER_SHEET_MS);
  };

  const submit = async () => {
    if (busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const next = await submitDealerApplication();
      if (mounted.current) update(next);
    } catch (e) {
      if (mounted.current) setError({ where: 'submit', text: dealerApplyErrorText(e) });
    } finally {
      busy.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  return {
    application,
    loading,
    refreshing,
    loadError,
    refresh,
    reload,
    form,
    setField,
    fieldErrors,
    saving,
    saved,
    save,
    uploading,
    upload,
    submitting,
    submit,
    error,
  };
}
