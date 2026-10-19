import { useEffect, useState } from 'react';
import { getMe } from '../api/services/profile.api';
import { hasSession, onSessionExpired, restoreSession, updateSession } from '../api/session';
import { clearSession } from '../api/tokenStorage';
import { checkFreshInstall, hasSeenIntro, markIntroSeen } from '../utils/appPrefs';
import { initLanguage } from '../i18n';
import { initialRouteFor } from '../navigation/authRoutes';
import { resetTo } from '../navigation/navigationRef';
import { ROUTES } from '../navigation/routes';
import { getUser, setUser } from '../store/userStore';
import { signOutLocally } from '../store/signOut';
import { startNetworkWatch } from '../store/networkStore';
import { stopPush } from '../push/pushNotifications';

// Before anything is read: on the first launch after (re)installing, drop any
// session left in the keychain - on iOS it survives uninstalling the app, and
// a fresh install must start signed out.
const startFresh = async () => {
  if (await checkFreshInstall()) {
    await clearSession();
  }
};

// App start:
// 1. Read the saved session and the app language from the keychain (no
//    network) and pick the first screen, so a signed-in user lands on Home at
//    once, already in their language. Signed out: the intro slides only until
//    they've been seen once, then Login.
// 2. Once the screens are showing, check the session with the backend in the
//    background (refreshes the token, updates the user). Offline is fine: the
//    user keeps using the app.
// Also: whenever the backend ends the session, clear the app and go to Login.
// Returns { ready, initialRoute: { name, params }, onNavigationReady }.
export default function useAppBoot() {
  const [initialRoute, setInitialRoute] = useState(null);

  // Watch connectivity for the whole app (offline banner, fail-fast, retries).
  useEffect(() => {
    startNetworkWatch();
  }, []);

  useEffect(() => {
    let active = true;
    startFresh()
      .then(() => Promise.all([restoreSession(), initLanguage(), hasSeenIntro()]))
      .then(([session, , introSeen]) => {
        if (!active) {
          return;
        }
        if (session?.user) {
          setUser(session.user);
          // Signed in already (e.g. from before this was remembered): a later
          // sign-out goes to Login, not back to the slides.
          if (!introSeen) {
            markIntroSeen();
          }
        }
        setInitialRoute(initialRouteFor(session, { introSeen }));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () =>
      onSessionExpired(() => {
        stopPush();
        signOutLocally();
        resetTo(ROUTES.LOGIN);
      }),
    [],
  );

  // Called by NavigationContainer onReady (the first screen is already visible).
  const onNavigationReady = () => {
    if (!hasSession()) {
      return;
    }
    const phone = getUser()?.contact;
    getMe({ phone })
      .then(({ user }) => {
        // Keep what only the device knows (photo, "what brings you").
        const merged = { ...getUser(), ...user, contact: phone ?? user.contact };
        setUser(merged);
        updateSession({ user: merged });
      })
      // Offline / server busy: keep the saved user. Auth failures have already
      // sent the user to Login (onSessionExpired).
      .catch(() => {});
  };

  return { ready: !!initialRoute, initialRoute, onNavigationReady };
}
