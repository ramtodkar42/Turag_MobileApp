import { useState } from 'react';
import { requestPasswordReset, resetPassword } from '../../../api/services/auth.api';
import useCountdown from '../../../hooks/useCountdown';
import { tNow } from '../../../i18n';

export const CODE_LENGTH = 6;
export const MIN_PASSWORD = 8;

// A failed step in plain words (as the web's /forgot-password).
const errorText = e => {
  switch (e?.code) {
    case 'AUTH_OTP_INVALID':
      return tNow('auth.forgot.wrongCode');
    case 'AUTH_OTP_EXPIRED':
      return tNow('auth.forgot.expired');
    case 'AUTH_OTP_RATE_LIMITED':
      return tNow('auth.forgot.tooMany');
    case 'RATE_LIMITED':
      return tNow('auth.forgot.wait');
    case 'SERVICE_UNAVAILABLE':
      return tNow('auth.forgot.unavailable');
    default:
      return e?.message || tNow('auth.forgot.error');
  }
};

// Forgot password over WhatsApp (ADR-0054, as the web), in three steps:
//   'identify' - email or mobile number -> a code goes by WhatsApp to the
//                account's registered number (never says if one matched)
//   'reset'    - the code + a new password (8+ characters, typed twice)
//   'done'     - signed out everywhere; sign in again with the new password
export default function useForgotPassword(initialIdentifier = '') {
  const [step, setStep] = useState('identify');
  const [identifier, setIdentifierValue] = useState(initialIdentifier);
  const [otpToken, setOtpToken] = useState('');
  const [code, setCodeValue] = useState('');
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirmValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const resend = useCountdown(0);

  // Typing again clears the last error.
  const edit = setter => value => {
    setter(value);
    setError('');
  };

  const sendCode = async () => {
    if (busy) return;
    if (!identifier.trim()) {
      setError(tNow('auth.forgot.enterIdentifier'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await requestPasswordReset(identifier);
      setOtpToken(res.otpToken);
      resend.restart(res.resendAfter);
      setCodeValue('');
      setStep('reset');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (busy) return;
    if (!new RegExp(`^[0-9]{${CODE_LENGTH}}$`).test(code.trim())) {
      setError(tNow('auth.forgot.enterCode'));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(tNow('auth.forgot.short'));
      return;
    }
    if (password !== confirm) {
      setError(tNow('auth.forgot.mismatch'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await resetPassword({ otpToken, code, password });
      setPasswordValue('');
      setConfirmValue('');
      setStep('done');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const changeIdentifier = () => {
    setStep('identify');
    setError('');
  };

  return {
    step,
    identifier,
    setIdentifier: edit(setIdentifierValue),
    code,
    setCode: edit(setCodeValue),
    password,
    setPassword: edit(setPasswordValue),
    confirm,
    setConfirm: edit(setConfirmValue),
    busy,
    error,
    resendIn: resend.remaining,
    sendCode,
    submit,
    changeIdentifier,
  };
}
