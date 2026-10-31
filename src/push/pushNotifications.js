// Push notifications (Firebase Cloud Messaging), as the backend sends them:
// every in-app notification (booking assigned, report ready, offer received,
// ...) also arrives as a push with { title, body } and data { type,
// entity_type, entity_id, link }.
// - startPush(): when signed in - asks permission once, registers this phone's
//   token with the backend (again whenever Firebase renews it), and listens.
// - stopPush(): on log out - removes this phone, so the next person on it
//   doesn't get the last user's pushes.
// - While the app is open a push shows as a banner at the top (like
//   Instagram's) and the bell's count refreshes.
// - Tapping a push opens its page (same links as the bell's list).
import { PermissionsAndroid, Platform } from 'react-native';
import {
  AuthorizationStatus,
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  hasPermission,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { registerPushDevice, unregisterPushDevice } from '../api/services/notification.api';
import { hasSession } from '../api/session';
import { navigationRef } from '../navigation/navigationRef';
import notificationTarget from '../screens/notifications/notificationTarget';
import { refreshNotifications } from '../store/notificationStore';
import { hideBanner } from './bannerStore';

let token = null;
let listeners = [];
// A tapped push whose page waits for the screens to be ready.
let waitingTarget = null;
let launchChecked = false;

const platform = () => (Platform.OS === 'ios' ? 'ios' : 'android');

// Android 13+ asks with the system dialog; iOS with Firebase's request.
const askPermission = async messaging => {
  if (Platform.OS === 'android') {
    if (Platform.Version < 33) {
      return true;
    }
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await requestPermission(messaging);
  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
};

// A push's link -> open its page (now, or once the screens are ready).
export const openPushLink = link => {
  const target = notificationTarget(link);
  if (!target || !hasSession()) {
    return;
  }
  if (navigationRef.isReady()) {
    navigationRef.navigate(target.route, target.params);
  } else {
    waitingTarget = target;
  }
};

const open = message => openPushLink(message?.data?.link);

// Called when the screens are ready: opens a push tapped while the app was
// starting (also one that launched the app).
export const openWaitingPush = async () => {
  // The push that launched the app is opened once per launch.
  if (!launchChecked) {
    launchChecked = true;
    try {
      const initial = await getInitialNotification(getMessaging());
      if (initial) {
        open(initial);
      }
    } catch {
      // No Firebase on this build / device: nothing to open.
    }
  }
  if (waitingTarget && navigationRef.isReady()) {
    navigationRef.navigate(waitingTarget.route, waitingTarget.params);
    waitingTarget = null;
  }
};

const register = async next => {
  token = next;
  try {
    await registerPushDevice(next, platform());
  } catch {
    // Offline / server busy: Firebase calls onTokenRefresh again later, and the
    // next app start registers again.
  }
};

// Are notifications turned off for Turag on this phone? (Android 13+ / iOS;
// older Android has no permission to check: false.) Never throws.
export const pushPermissionOff = async () => {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version < 33) {
        return false;
      }
      return !(await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS));
    }
    return (await hasPermission(getMessaging())) === AuthorizationStatus.DENIED;
  } catch {
    return false;
  }
};

// Turned back on (in Settings): register this phone now, not on the next start.
export const registerPushIfAllowed = async () => {
  if (token || !hasSession() || (await pushPermissionOff())) {
    return;
  }
  try {
    await register(await getToken(getMessaging()));
  } catch {
    // Firebase not set up on this build.
  }
};

// Signed in: register this phone and listen. Safe to call more than once.
export const startPush = async () => {
  if (listeners.length) {
    return;
  }
  try {
    const messaging = getMessaging();
    listeners = [
      onTokenRefresh(messaging, register),
      // A push while the app is open: refresh the list - the notification store
      // shows the banner for the new item (one source, so no double banner).
      onMessage(messaging, () => refreshNotifications()),
      onNotificationOpenedApp(messaging, open),
    ];
    if (await askPermission(messaging)) {
      await register(await getToken(messaging));
    }
  } catch {
    // Firebase not set up on this build: in-app notifications still work.
  }
};

// Log out: stop pushes to this phone (the backend's unregister needs the
// session, so call it before ending it). The phone's push token is also
// thrown away, so nothing sent to it reaches the next person on this phone -
// even when the server can't be told (the session already expired:
// { expired: true }). The next sign-in gets a fresh token.
export const stopPush = async ({ expired = false } = {}) => {
  listeners.forEach(unsubscribe => unsubscribe());
  listeners = [];
  waitingTarget = null;
  hideBanner();
  const last = token;
  token = null;
  if (!last) {
    return;
  }
  if (!expired) {
    await unregisterPushDevice(last).catch(() => {});
  }
  try {
    await deleteToken(getMessaging());
  } catch {
    // Firebase not set up on this build / offline: nothing more to do.
  }
};
