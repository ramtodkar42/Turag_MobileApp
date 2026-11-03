import { useRef, useState } from 'react';
import { confirmPasswordLogin, loginWithPassword } from '../../../api/services/auth.api';
import { startSession } from '../../../api/session';
import {
  getPendingSteps,
  resetAfterSignIn,
  routeAfterSignIn,
} from '../../../navigation/authRoutes';
import { ROUTES } from '../../../navigation/routes';
import { setUser } from '../../../store/userStore';
import useCountdown from '../../../hooks/useCountdown';
import { isEmail } from '../../../utils/validators';
import { tNow } from '../../../i18n';

// The confirmation code's length (the backend sends 6 digits).
export const CODE_LENGTH = 6;
// Wait before "Resend code" (the server keeps its own cooldown too).
const RESEND_AFTER_S = 30;
// The test server's code (devHint) is shown and filled in only in development.
const SHOW_TEST_OTP = __DEV__;

// A failed sign-in in plain words (as the web's /login).
const errorText = e => {
  switch (e?.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return tNow('auth.emailLogin.wrong');
    case 'VALIDATION_ERROR':
      return tNow('auth.emailLogin.fillBoth');
    case 'RATE_LIMITED':
    case 'AUTH_OTP_RATE_LIMITED':
      return tNow('auth.emailLogin.locked');
    case 'SERVICE_UNAVAILABLE':
      return tNow('auth.emailLogin.unavailable');
    case 'AUTH_OTP_INVALID':
      return tNow('auth.emailLogin.confirm.wrongCode');
    case 'AUTH_OTP_EXPIRED':
    case 'DEALER_CONFIRMATION_NOT_FOUND':
      return tNow('auth.emailLogin.confirm.expired');
    default:
      return e?.message || tNow('auth.emailLogin.error');
  }
};

// Email + password sign-in (as the web): then the same next steps as after the
// OTP (Terms if still owed, else "Login Successful") - and a dealer lands in
// their Business section, as the web sends dealers to the dealer portal.
// When Turag's team added this email as a dealer on an existing account, the
// server first sends a code to that account's mobile: step 'confirm' asks for
// it (as the web), then signs in.
// Returns { step ('signIn' | 'confirm'), email, password, code, phoneHint,
// setEmail, setPassword, setCode, errors: { email?, password?, code?, form? },
// loading, resendIn, submit(), resend(), back() }.
export default function useEmailLogin(navigation) {
  const [email, setEmailValue] = useState('');
  const [password, setPasswordValue] = useState('');
  const [code, setCodeValue] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  // The pending confirmation: { otpToken, confirmTicket, phoneHint }.
  const [pending, setPending] = useState(null);
  const resendTimer = useCountdown(0);
  const busy = useRef(false);

  const setEmail = value => {
    setEmailValue(value);
    setErrors(e => (e.email || e.form ? {} : e));
  };
  const setPassword = value => {
    setPasswordValue(value);
    setErrors(e => (e.password || e.form ? {} : e));
  };
  const setCode = value => {
    setCodeValue(value);
    setErrors(e => (e.code || e.form ? {} : e));
  };

  // Signed in: the same next steps as every other sign-in.
  const finish = async result => {
    const { user } = result;
    const steps = getPendingSteps(user, result.consentRequired);
    await startSession({ ...result, user, pending: steps });
    setUser(user);
    const [route, params] = routeAfterSignIn(user, steps);
    const dealer = (user.roles ?? []).includes('dealer');
    resetAfterSignIn(navigation, [
      route,
      dealer && route === ROUTES.AUTH_SUCCESS ? { ...params, thenOpen: ROUTES.BUSINESS_HOME } : params,
    ]);
  };

  // Email + password (again for "Resend code": the server sends a new code).
  const signIn = async () => {
    const result = await loginWithPassword({ email, password });
    if (!result.confirmationRequired) {
      await finish(result);
      return;
    }
    setPending({
      otpToken: result.otpToken,
      confirmTicket: result.confirmTicket,
      phoneHint: result.phoneHint,
    });
    setCodeValue(SHOW_TEST_OTP && result.devHint ? result.devHint : '');
    resendTimer.restart(RESEND_AFTER_S);
    setLoading(false);
    busy.current = false;
  };

  const run = async work => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      await work();
    } catch (e) {
      setErrors({ form: errorText(e) });
      setLoading(false);
      busy.current = false;
    }
  };

  // The code from the account's mobile -> signed in.
  const confirm = async () => finish(
      await confirmPasswordLogin({ email, code, otpToken: pending.otpToken, confirmTicket: pending.confirmTicket }),
    );

  const submit = () => {
    if (pending) {
      if (!new RegExp(`^[0-9]{${CODE_LENGTH}}$`).test(code.trim())) {
        setErrors({ code: tNow('auth.emailLogin.confirm.enterCode') });
        return;
      }
      setErrors({});
      run(confirm);
      return;
    }
    const found = {};
    if (!email.trim()) found.email = tNow('auth.emailLogin.enterEmail');
    else if (!isEmail(email.trim())) found.email = tNow('errors.email');
    if (!password) found.password = tNow('auth.emailLogin.enterPassword');
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    run(signIn);
  };

  const resend = () => {
    if (resendTimer.remaining > 0) return;
    setErrors({});
    run(signIn);
  };

  // Back from the code step to email + password.
  const back = () => {
    setPending(null);
    setCodeValue('');
    setErrors({});
  };

  return {
    step: pending ? 'confirm' : 'signIn',
    email,
    password,
    code,
    phoneHint: pending?.phoneHint ?? '',
    setEmail,
    setPassword,
    setCode,
    errors,
    loading,
    resendIn: resendTimer.remaining,
    submit,
    resend,
    back,
  };
}
