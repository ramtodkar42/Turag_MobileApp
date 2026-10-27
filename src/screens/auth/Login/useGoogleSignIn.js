import { useState } from 'react';
import { openGoogleSignIn } from '../../../api/googleAuth';
import { signInWithGoogle } from '../../../api/services/auth.api';
import { startSession } from '../../../api/session';
import { getPendingSteps, resetAfterSignIn, routeAfterSignIn } from '../../../navigation/authRoutes';
import { setUser } from '../../../store/userStore';
import { tNow } from '../../../i18n';

// "Continue with Google" on the Login screen (as the web): Google in a secure
// browser tab, then POST /auth/google -
//   - a Turag account with that email (verified): signed in, then the same
//     next steps as after the OTP (finish sign-up, or "Login Successful");
//   - no account yet: `google` is set ({ token, name, email }) - the user
//     verifies their mobile number as usual, and after the OTP the Google email
//     is linked (and prefilled on Create Account).
// Returns { busy, error, google, start(), cancelGoogle() }.
export default function useGoogleSignIn(navigation) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [google, setGoogle] = useState(null);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const token = await openGoogleSignIn();
      if (!token) return; // closed the tab
      const result = await signInWithGoogle(token);
      if (result.status === 'NEEDS_PHONE') {
        setGoogle({ token, name: result.name, email: result.email });
        return;
      }
      const { user } = result;
      const pending = getPendingSteps(user, result.consentRequired);
      await startSession({ ...result, user, pending });
      setUser(user);
      resetAfterSignIn(navigation, routeAfterSignIn(user, pending));
    } catch (e) {
      setError(e?.message || tNow('auth.google.error'));
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, google, start, cancelGoogle: () => setGoogle(null) };
}
