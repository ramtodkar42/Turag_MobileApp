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

const SIGN_IN_SCREENS = new Set([
  ROUTES.INTRO,
  ROUTES.LOGIN,
  ROUTES.EMAIL_LOGIN,
  ROUTES.VERIFY_OTP,
  ROUTES.COMPLETE_PROFILE,
  ROUTES.AUTH_SUCCESS,
]);

// The app screens a guest was on when they chose to log in (the sign-in
// screens were opened on top of them), or [] when sign-in is the whole app.
const guestScreensUnder = navigation => {
  const routes = navigation.getState?.()?.routes ?? [];
  const end = routes.findIndex(route => SIGN_IN_SCREENS.has(route.name));
  return end > 0 && routes[0].name === ROUTES.MAIN_TABS ? routes.slice(0, end) : [];
};

// Moves on after a sign-in step ([route, params] from routeAfterSignIn or
// Create Account), clearing the sign-in screens from history.
// A guest who logged in from the app (e.g. tapping a heart) comes back to the
// very screen they were on, still in place: "Login Successful" is shown on
// top of it and then closes (AuthSuccess `goBack`). A new account first fills
// in Create Account on its own (back can't skip it), then lands on Home.
// Inspectors always go to their own home.
export const resetAfterSignIn = (navigation, [name, params]) => {
  const under = guestScreensUnder(navigation);
  if (under.length && name === ROUTES.AUTH_SUCCESS && params?.next === ROUTES.MAIN_TABS) {
    navigation.reset({
      index: under.length,
      routes: [...under, { name, params: { ...params, goBack: true } }],
    });
  } else {
    navigation.reset({ index: 0, routes: [{ name, params }] });
  }
};

// First screen when the app opens: signed out -> the intro slides the first
// time (until finished or skipped), then Login - or the marketplace for
// someone who chose to browse without logging in; mid sign-up -> Create
// Account; signed in -> their home (no success screen on a normal app start).
export const initialRouteFor = (session, { introSeen = false, guest = false } = {}) => {
  if (!session) {
    if (guest) {
      return { name: ROUTES.MAIN_TABS };
    }
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
