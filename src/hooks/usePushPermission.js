import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { pushPermissionOff, registerPushIfAllowed } from '../push/pushNotifications';

// Whether notifications are turned off for Turag on this phone. Checked when
// the screen opens and each time the app comes back (e.g. from Settings);
// turned back on, this phone is registered for pushes straight away.
export default function usePushPermission() {
  const [off, setOff] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const isOff = await pushPermissionOff();
      if (!active) return;
      setOff(isOff);
      if (!isOff) registerPushIfAllowed();
    };
    check();
    const sub = AppState.addEventListener('change', next => next === 'active' && check());
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return off;
}
