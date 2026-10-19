import FastImage from '@d11/react-native-fast-image';
import { mediaUrl } from './mediaUrl';

// Best-effort: warm FastImage's cache with these photos so they paint instantly
// when they scroll into view instead of downloading on demand. De-duped and
// capped so we don't hammer the network. `sources` is a list of uri strings or
// { uri } objects. (Uses FastImage.preload so it warms the same cache the images
// display from.)
export default function prefetchImages(sources = [], limit = 12) {
  // Absolutise (relative on a local backend) and drop empties — FastImage's
  // preload runs on a background thread and would crash on a relative/empty url.
  const uris = sources
    .map(s => mediaUrl(typeof s === 'string' ? s : s?.uri))
    .filter(Boolean);
  const list = [...new Set(uris)].slice(0, limit).map(uri => ({ uri }));
  if (list.length === 0) {
    return;
  }
  try {
    FastImage.preload(list);
  } catch {
    // Native module not ready (before a rebuild): skip, images still load live.
  }
}
