import { useEffect, useRef, useState } from 'react';
import { getProfile, setMarketingConsent } from '../../../api/services/profile.api';
import { tNow } from '../../../i18n';

const isMarketing = consent => consent.key === 'MARKETING';

// Loads account details (mobile, account ID, languages, consents), and turns
// marketing messages on / off: the switch moves at once and is undone if
// saving fails (with a message).
// Returns { profile, loading, error, setMarketing(on), savingMarketing, marketingError }.
export default function usePersonalInfo() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [savingMarketing, setSavingMarketing] = useState(false);
  const [marketingError, setMarketingError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getProfile()
      .then(data => mounted.current && setProfile(data))
      .catch(e => mounted.current && setError(e.message || tNow('profile.info.loadError')));
    return () => {
      mounted.current = false;
    };
  }, []);

  const setConsents = consents => setProfile(prev => (prev ? { ...prev, consents } : prev));
  const markMarketing = on =>
    setProfile(prev =>
      prev ? { ...prev, consents: prev.consents.map(c => (isMarketing(c) ? { ...c, verified: on } : c)) } : prev,
    );

  const setMarketing = async on => {
    if (savingMarketing) {
      return;
    }
    setMarketingError('');
    setSavingMarketing(true);
    markMarketing(on);
    try {
      const consents = await setMarketingConsent(on);
      if (mounted.current) {
        setConsents(consents);
      }
    } catch (e) {
      if (mounted.current) {
        markMarketing(!on);
        setMarketingError(e.message || tNow('profile.info.marketingError'));
      }
    } finally {
      if (mounted.current) {
        setSavingMarketing(false);
      }
    }
  };

  return {
    profile,
    loading: !profile && !error,
    error,
    setMarketing,
    savingMarketing,
    marketingError,
  };
}
