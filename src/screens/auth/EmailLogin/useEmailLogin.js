import { useState } from 'react';
import { loginWithPassword } from '../../../api/services/auth.api';
import { startSession } from '../../../api/session';
import {
  getPendingSteps,
  resetAfterSignIn,
  routeAfterSignIn,
} from '../../../navigation/authRoutes';
import { ROUTES } from '../../../navigation/routes';
import { setUser } from '../../../store/userStore';
import { isEmail } from '../../../utils/validators';
import { tNow } from '../../../i18n';

// A failed sign-in in plain words (as the web's /login).
const errorText = e => {
  switch (e?.code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return tNow('auth.emailLogin.wrong');
    case 'VALIDATION_ERROR':
      return tNow('auth.emailLogin.fillBoth');
    case 'RATE_LIMITED':
      return tNow('auth.emailLogin.locked');
    case 'SERVICE_UNAVAILABLE':
      return tNow('auth.emailLogin.unavailable');
    default:
      return e?.message || tNow('auth.emailLogin.error');
  }
};

// Email + password sign-in (as the web): then the same next steps as after the
// OTP (Terms if still owed, else "Login Successful") - and a dealer lands in
// their Business section, as the web sends dealers to the dealer portal.
// Returns { email, password, setEmail, setPassword, errors: { email?, password?, form? }, loading, submit() }.
export default function useEmailLogin(navigation) {
  const [email, setEmailValue] = useState('');
  const [password, setPasswordValue] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setEmail = value => {
    setEmailValue(value);
    setErrors(e => (e.email || e.form ? {} : e));
  };
  const setPassword = value => {
    setPasswordValue(value);
    setErrors(e => (e.password || e.form ? {} : e));
  };

  const submit = async () => {
    if (loading) return;
    const found = {};
    if (!email.trim()) found.email = tNow('auth.emailLogin.enterEmail');
    else if (!isEmail(email.trim())) found.email = tNow('errors.email');
    if (!password) found.password = tNow('auth.emailLogin.enterPassword');
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      const result = await loginWithPassword({ email, password });
      const { user } = result;
      const pending = getPendingSteps(user, result.consentRequired);
      await startSession({ ...result, user, pending });
      setUser(user);
      const [route, params] = routeAfterSignIn(user, pending);
      const dealer = (user.roles ?? []).includes('dealer');
      resetAfterSignIn(navigation, [
        route,
        dealer && route === ROUTES.AUTH_SUCCESS
          ? { ...params, thenOpen: ROUTES.BUSINESS_HOME }
          : params,
      ]);
    } catch (e) {
      setErrors({ form: errorText(e) });
      setLoading(false);
    }
  };

  return { email, password, setEmail, setPassword, errors, loading, submit };
}
