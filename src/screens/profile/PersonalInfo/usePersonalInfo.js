import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getProfile, setOptionalConsent } from '../../../api/services/profile.api';
import { tNow } from '../../../i18n';

// Loads account details (mobile, account ID, email + whether it's verified,
// languages, consents) - again quietly each time the page comes back into view
// (e.g. after the user tapped the email link) - and turns
// the optional consents (Offers and updates, WhatsApp updates) on / off: the
// switch moves at once and is undone if saving fails (with a message).
// Returns { profile, loading, error, setConsent(key, on), saving (the key being
// saved | null), consentError, setEmail(address) (saved: shown unverified),
// setMarketing(on), savingMarketing, marketingError }.
export default function usePersonalInfo() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);
  const [consentError, setConsentError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // First load shows its error; later quiet reloads keep what's on screen.
  const load = useCallback(() => {
    getProfile()
      .then(data => {
        if (!mounted.current) return;
        setProfile(data);
        setError(null);
      })
      .catch(e => mounted.current && setError(prev => prev ?? e.message ?? tNow('profile.info.loadError')));
  }, []);
  useFocusEffect(load);

  const setEmail = address =>
    setProfile(prev => (prev ? { ...prev, email: address, emailVerified: false } : prev));

  const setConsents = consents => setProfile(prev => (prev ? { ...prev, consents } : prev));
  const mark = (key, on) =>
    setProfile(prev =>
      prev ? { ...prev, consents: prev.consents.map(c => (c.key === key ? { ...c, verified: on } : c)) } : prev,
    );

  const setConsent = async (key, on) => {
    if (saving) {
      return;
    }
    setConsentError('');
    setSaving(key);
    mark(key, on);
    try {
      const consents = await setOptionalConsent(key, on);
      if (mounted.current) {
        setConsents(consents);
      }
    } catch (e) {
      if (mounted.current) {
        mark(key, !on);
        setConsentError(e.message || tNow('profile.info.marketingError'));
      }
    } finally {
      if (mounted.current) {
        setSaving(null);
      }
    }
  };

  return {
    profile,
    loading: !profile && !error,
    error,
    setConsent,
    saving,
    consentError,
    setEmail,
    setMarketing: on => setConsent('MARKETING', on),
    savingMarketing: saving === 'MARKETING',
    marketingError: consentError,
  };
}
