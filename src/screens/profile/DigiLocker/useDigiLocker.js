import { useCallback, useEffect, useRef, useState } from 'react';
import { completeDigiLocker, startDigiLocker } from '../../../api/services/verification.api';
import { tNow } from '../../../i18n';

// DigiLocker can take a few seconds to report the consent after sending the
// user back, so the result is checked a few times (as the web's return page).
const POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 3000;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Where DigiLocker sends the user back on Turag's site (KYC_DIGILOCKER_REDIRECT_URL).
const RETURN_PATH = '/account/verification/digilocker';
export const isReturnUrl = url => {
  try {
    return new URL(url).pathname.replace(/\/+$/, '') === RETURN_PATH;
  } catch {
    return String(url).includes(RETURN_PATH);
  }
};

// The DigiLocker journey, step by step (phase):
//   'starting' - asking the server for the DigiLocker page
//   'web'      - the user is on DigiLocker (url)
//   'checking' - back from DigiLocker: finishing it with the server
//   'done'     - verification: APPROVED / FAILED / EXPIRED / INITIATED (still waiting)
//   'error'    - message (e.g. DigiLocker unavailable)
// Returns { phase, url, verification, error, onReturn(), checkAgain(), restart() }.
export default function useDigiLocker() {
  const [state, setState] = useState({ phase: 'starting' });
  const alive = useRef(true);
  const checking = useRef(false);

  const set = useCallback(next => alive.current && setState(next), []);

  const start = useCallback(async () => {
    set({ phase: 'starting' });
    try {
      const { redirectUrl } = await startDigiLocker();
      set({ phase: 'web', url: redirectUrl });
    } catch (e) {
      set({ phase: 'error', error: e?.message || tNow('verify.dl.startError') });
    }
  }, [set]);

  // Finishes the journey, checking again while DigiLocker hasn't reported yet.
  const check = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    set({ phase: 'checking' });
    try {
      for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt += 1) {
        const verification = await completeDigiLocker();
        if (verification.status !== 'INITIATED' || attempt === POLL_ATTEMPTS) {
          set({ phase: 'done', verification });
          return;
        }
        await wait(POLL_INTERVAL_MS);
      }
    } catch (e) {
      set({ phase: 'error', error: e?.message || tNow('verify.dl.checkError'), canCheck: true });
    } finally {
      checking.current = false;
    }
  }, [set]);

  useEffect(() => {
    alive.current = true;
    start();
    return () => {
      alive.current = false;
    };
  }, [start]);

  return { ...state, onReturn: check, checkAgain: check, restart: start };
}
