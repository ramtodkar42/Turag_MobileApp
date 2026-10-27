import { useState } from 'react';
import { validateAccount } from '../../../utils/validators';
import { INITIAL_CONSENTS } from './constants';
import { tNow } from '../../../i18n';

const INITIAL_VALUES = { fullName: '', email: '', purpose: null };

// Form state for Create Account: name, email, purpose and consents. The email
// only has to look right here; it's confirmed later from the link Turag emails.
// onSubmit(values) finishes sign-up.
// needsProfile / needsConsent: which sections the screen shows (and checks).
// An error with `field` from onSubmit (e.g. "email already used") shows on that field.
// prefill: { fullName, email } to start with (from Google sign-in).
export default function useProfileForm({ needsProfile = true, needsConsent = true, prefill, onSubmit }) {
  const [values, setValues] = useState(() => ({
    ...INITIAL_VALUES,
    fullName: prefill?.fullName ?? '',
    email: prefill?.email ?? '',
  }));
  const [consents, setConsents] = useState(INITIAL_CONSENTS);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const email = values.email.trim();
  const canAccept = !needsConsent || (consents.terms && consents.privacy);

  const clearError = name =>
    setErrors(prev => (prev[name] || prev.form ? { ...prev, [name]: undefined, form: undefined } : prev));

  const setField = name => value => {
    setValues(prev => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const toggleConsent = key => () => {
    setConsents(prev => ({ ...prev, [key]: !prev[key] }));
    clearError('consents');
  };

  const submit = async () => {
    const found = validateAccount({ ...values, consents, needsProfile, needsConsent });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ fullName: values.fullName.trim(), email, purpose: values.purpose, consents });
    } catch (error) {
      const message = error.message || tNow('errors.generic');
      setErrors(error.field ? { [error.field]: message } : { form: message });
      setLoading(false);
    }
  };

  return {
    values,
    consents,
    errors,
    loading,
    canAccept,
    setField,
    toggleConsent,
    submit,
  };
}
