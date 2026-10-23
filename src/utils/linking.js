import { Linking } from 'react-native';
import { BACKEND_URL } from '../api/config';

// Opens other apps (dialer, maps). Each returns false when nothing could
// open the link, so the screen can show a message instead.
const open = async url => {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
};

// Phone dialer with the number filled in (the user still taps call).
export const callPhone = phone => open(`tel:${String(phone).replace(/[^\d+]/g, '')}`);

// A page of the Turag website in the browser (e.g. '/terms', '/refund_policy').
export const openWebPage = path => open(`${BACKEND_URL}${path}`);

// Driving directions in Google Maps (app if installed, otherwise the browser).
// Uses coordinates when known, otherwise the address text.
export const openDirections = ({ location, address }) => {
  const destination = location ? `${location.latitude},${location.longitude}` : address;
  return open(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
  );
};
