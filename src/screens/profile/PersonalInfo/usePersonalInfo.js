import { useEffect, useState } from 'react';
import { getProfile } from '../../../api/services/profile.api';
import { tNow } from '../../../i18n';

// Loads account details (mobile, account ID, languages, consents).
export default function usePersonalInfo() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getProfile()
      .then(data => active && setProfile(data))
      .catch(e => active && setError(e.message || tNow('profile.info.loadError')));
    return () => {
      active = false;
    };
  }, []);

  return { profile, loading: !profile && !error, error };
}
