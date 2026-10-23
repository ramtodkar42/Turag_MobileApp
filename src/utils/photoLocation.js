import Geolocation from '@react-native-community/geolocation';

// Best-effort location for inspection photos (the web's bestEffortPosition):
// { lat, lng, accuracyM } or undefined (permission denied, location off, no
// fix in time). Never throws and never holds an upload up for long.
//
// warmPhotoLocation() when the user is about to take a photo starts the fix
// early, so it's usually ready by the time the photo is uploaded. If the
// location permission is refused it isn't asked again until the app restarts.

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

const PERMISSION_DENIED = 1;
// A position up to a minute old is still where the car is.
const MAX_AGE_MS = 60 * 1000;
// Quick network / recent position (as the web: no high-accuracy GPS wait).
const OPTIONS = { enableHighAccuracy: false, timeout: 10000, maximumAge: MAX_AGE_MS };

let denied = false;
let last = null; // { at, value }
let inflight = null;

const fresh = () => last && Date.now() - last.at < MAX_AGE_MS;

const locate = () =>
  new Promise(resolve => {
    try {
      Geolocation.getCurrentPosition(
        ({ coords }) => {
          const value = {
            lat: coords.latitude,
            lng: coords.longitude,
            ...(coords.accuracy != null ? { accuracyM: coords.accuracy } : {}),
          };
          last = { at: Date.now(), value };
          resolve(value);
        },
        error => {
          if (error?.code === PERMISSION_DENIED) denied = true;
          resolve(undefined);
        },
        OPTIONS,
      );
    } catch {
      resolve(undefined);
    }
  });

export const warmPhotoLocation = () => {
  if (denied || fresh() || inflight) return;
  inflight = locate().finally(() => {
    inflight = null;
  });
};

export const getPhotoLocation = async (timeoutMs = 4000) => {
  if (fresh()) return last.value;
  if (denied) return undefined;
  warmPhotoLocation();
  const pending = inflight ?? Promise.resolve(last?.value);
  let timer;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
  });
  try {
    return await Promise.race([pending, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

// Tests only.
export const resetPhotoLocation = () => {
  denied = false;
  last = null;
  inflight = null;
};
