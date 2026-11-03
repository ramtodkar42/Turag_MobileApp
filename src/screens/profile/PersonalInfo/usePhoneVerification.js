import { useRef, useState } from 'react';
import { confirmPhoneVerification, startPhoneVerification } from '../../../api/services/profile.api';
import { updateSession } from '../../../api/session';
import { getUser, setUser } from '../../../store/userStore';
import useCountdown from '../../../hooks/useCountdown';
import { tNow } from '../../../i18n';

export const CODE_LENGTH = 6;
// The test server's code (devHint) is filled in only in development.
const SHOW_TEST_OTP = __DEV__;

// A failed send / check, in plain words.
const errorText = e => {
  switch (e?.code) {
    case 'AUTH_OTP_INVALID':
      return tNow('profile.mobile.wrongCode');
    case 'AUTH_OTP_EXPIRED':
      return tNow('profile.mobile.expired');
    case 'RATE_LIMITED':
    case 'AUTH_OTP_RATE_LIMITED':
      return tNow('profile.mobile.tooMany');
    default:
      return e?.message || tNow('profile.mobile.error');
  }
};

// Verify the account's own mobile (as the web's Account page): a code by
// WhatsApp (or SMS) to the number on the account, then typed here. Signing in
// with the mobile already verifies it; this is for e.g. a dealer whose number
// Turag's team entered. onVerified(): the page shows it verified.
// Returns { step ('idle' | 'code'), channel, code, setCode, busy ('send' |
// 'confirm' | null), error, notice, resendIn, send(channel), confirm(), cancel() }.
export default function usePhoneVerification({ onVerified }) {
  const [token, setToken] = useState(null);
  const [channel, setChannel] = useState('whatsapp');
  const [code, setCodeValue] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const resendTimer = useCountdown(0);
  const working = useRef(false);

  const setCode = value => {
    setCodeValue(value);
    if (error) setError('');
  };

  const verified = () => {
    setToken(null);
    setCodeValue('');
    setNotice(tNow('profile.mobile.done'));
    const user = getUser();
    if (user) {
      const next = { ...user, phoneVerified: true };
      setUser(next);
      updateSession({ user: next });
    }
    onVerified?.();
  };

  const run = async (kind, work) => {
    if (working.current) return;
    working.current = true;
    setBusy(kind);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(errorText(e));
    } finally {
      working.current = false;
      setBusy(null);
    }
  };

  const send = next =>
    run('send', async () => {
      setChannel(next);
      setNotice('');
      const res = await startPhoneVerification(next);
      if (res.alreadyVerified) {
        verified();
        return;
      }
      setToken(res.otpToken);
      setCodeValue(SHOW_TEST_OTP && res.devHint ? res.devHint : '');
      resendTimer.restart(res.resendAfter);
    });

  const confirm = () => {
    if (!new RegExp(`^[0-9]{${CODE_LENGTH}}$`).test(code.trim())) {
      setError(tNow('profile.mobile.enterCode'));
      return;
    }
    run('confirm', async () => {
      await confirmPhoneVerification({ otpToken: token, code });
      verified();
    });
  };

  const cancel = () => {
    setToken(null);
    setCodeValue('');
    setError('');
  };

  return {
    step: token ? 'code' : 'idle',
    channel,
    code,
    setCode,
    busy,
    error,
    notice,
    resendIn: resendTimer.remaining,
    send,
    confirm,
    cancel,
  };
}
