import { ROLES } from '../constants/roles';
import { getHomeRoute } from './homeRoute';
import { ROUTES } from './routes';

// Sign-up steps a signed-in user still owes, or null when there are none.
// - needsConsent: Terms + Privacy not accepted yet (the backend says so).
// - needsProfile: a consumer without a name (a new account). Inspectors are
//   created by Turag, so they never fill in the consumer profile.
export const getPendingSteps = (user, consentRequired) => {
  const needsConsent = !!consentRequired;
  const needsProfile = user?.role !== ROLES.INSPECTOR && !user?.fullName;
  return needsConsent || needsProfile ? { needsConsent, needsProfile } : null;
};

// [route, params] after a successful OTP: finish sign-up, or "Login Successful" -> home.
export const routeAfterSignIn = (user, pending) =>
  pending
    ? [ROUTES.COMPLETE_PROFILE, { phone: user?.contact, ...pending }]
    : [ROUTES.AUTH_SUCCESS, { titleKey: 'auth.loginSuccessful', next: getHomeRoute(user?.role) }];

// First screen when the app opens: signed out -> the intro slides the first
// time (until finished or skipped), then Login; mid sign-up -> Create Account;
// signed in -> their home (no success screen on a normal app start).
export const initialRouteFor = (session, { introSeen = false } = {}) => {
  if (!session) {
    return { name: introSeen ? ROUTES.LOGIN : ROUTES.INTRO };
  }
  if (session.pending) {
    return {
      name: ROUTES.COMPLETE_PROFILE,
      params: { phone: session.user?.contact, ...session.pending },
    };
  }
  return { name: getHomeRoute(session.user?.role) };
};
