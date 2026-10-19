import { BACKEND_URL } from '../api/config';

// Backend media URLs are RELATIVE on a local backend ("/api/v1/media/…") and
// ABSOLUTE on staging ("https://…"). FastImage/Glide can only load an absolute
// url - a relative or empty one throws "Must not be null or empty" and crashes
// the app. This makes a media url absolute (prefixing the backend URL when it's
// relative) and returns null when there's nothing usable.
export const mediaUrl = value => {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) {
    return null;
  }
  return url.startsWith('/') ? `${BACKEND_URL}${url}` : url;
};
