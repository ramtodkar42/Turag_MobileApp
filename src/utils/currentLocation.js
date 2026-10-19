import Geolocation from '@react-native-community/geolocation';
import { tNow } from '../i18n';

// Asks once for "while using the app" location (the library shows the
// Android / iOS permission prompt itself). On Android it uses Google Play's
// fused location when available (Wi-Fi + mobile network + GPS).
Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

// GeolocationError codes.
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2; // location (GPS) is switched off / no provider
const TIMEOUT = 3;

const MESSAGES = {
  [PERMISSION_DENIED]: 'booking.address.permissionDenied',
  [POSITION_UNAVAILABLE]: 'booking.address.locationOff',
  [TIMEOUT]: 'booking.address.locationTimeout',
};

// 1. Quick: Wi-Fi / mobile network position (or a recent one) - answers in a
//    second or two, even indoors, and is close enough for an address.
const QUICK = { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 };
// 2. Precise: a fresh GPS fix, which can take a while to start.
const PRECISE = { enableHighAccuracy: true, timeout: 20000, maximumAge: 60 * 1000 };

const locate = options =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      reject,
      options,
    );
  });

const readable = error => new Error(tNow(MESSAGES[error?.code] ?? 'booking.address.locationError'));

// The phone's current position: { lat, lng }. Tries the quick way first, then
// GPS. Throws an Error with a message saying what to do (allow permission /
// turn location on / try again or search).
export const getCurrentLocation = async () => {
  try {
    return await locate(QUICK);
  } catch (error) {
    // No point retrying without permission or with location switched off.
    if (error?.code === PERMISSION_DENIED || error?.code === POSITION_UNAVAILABLE) {
      throw readable(error);
    }
  }
  try {
    return await locate(PRECISE);
  } catch (error) {
    throw readable(error);
  }
};
