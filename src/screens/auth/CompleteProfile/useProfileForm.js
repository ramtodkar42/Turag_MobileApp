import { useState } from 'react';
import { isEmail, validateAccount } from '../../../utils/validators';
import { INITIAL_CONSENTS } from './constants';
import { tNow } from '../../../i18n';

const INITIAL_VALUES = { fullName: '', email: '', purpose: null };

// Form state for Create Account: name, email (+ verified flag), purpose and
// consents. "Verify" marks the email verified at once when it looks valid (the
// backend has no email verification step yet); the email stays verified only
// while the field still holds that address.
// onSubmit(values) finishes sign-up.
// needsProfile / needsConsent: which sections the screen shows (and checks).
// An error with `field` from onSubmit (e.g. "email already used") shows on that field.
export default function useProfileForm({ needsProfile = true, needsConsent = true, onSubmit }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [consents, setConsents] = useState(INITIAL_CONSENTS);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  const email = values.email.trim();
  const emailVerified = !!verifiedEmail && verifiedEmail === email;
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

  const verifyEmail = () => {
    if (!isEmail(email)) {
      setErrors(prev => ({ ...prev, email: tNow('errors.email') }));
      return;
    }
    setVerifiedEmail(email);
    clearError('email');
  };

  const submit = async () => {
    const found = validateAccount({ ...values, emailVerified, consents, needsProfile, needsConsent });
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
    emailVerified,
    canAccept,
    setField,
    toggleConsent,
    verifyEmail,
    submit,
  };
}
