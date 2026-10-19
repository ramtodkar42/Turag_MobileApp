import { useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { colors } from '../../theme';
import { mediaUrl } from '../../utils/mediaUrl';

// Photos shown at least once this session (by uri). An image that has already
// appeared - e.g. when the list re-renders/re-mounts while searching, or on
// scroll - is shown INSTANTLY with no fade, so it never blinks or goes blank.
// Only a genuinely new photo fades in. Capped so ever-changing signed urls
// don't grow this set unbounded.
const shown = new Set();
const markShown = uri => {
  if (!uri) {
    return;
  }
  if (shown.size > 500) {
    shown.clear();
  }
  shown.add(uri);
};

// Fills its parent completely (cover), like a CSS background image, backed by
// FastImage so a photo seen once paints from its disk cache instantly on every
// later view (across scrolls, searches and app restarts). A neutral placeholder
// shows through while a NEW photo loads; it then fades in. Already-seen photos
// skip the fade so re-mounts don't blink. Parent must have a size and
// `overflow: 'hidden'`.
function FillImage({ source, resizeMode = 'cover' }) {
  const remote = source != null && typeof source === 'object';
  // Absolutise the url (relative on a local backend) and drop empty ones: an
  // empty / relative uri makes FastImage's Glide crash ("Must not be null or
  // empty"). When there's no usable uri we show the plain placeholder instead.
  // (Local require() images are a number and are always fine.)
  const uri = remote ? mediaUrl(source.uri) : null;
  const hasImage = remote ? !!uri : source != null;
  // Fixed at mount: local (require) images and already-seen photos skip the fade.
  const seen = useRef(!uri || shown.has(uri)).current;
  const opacity = useRef(new Animated.Value(seen ? 1 : 0)).current;

  const onLoad = () => {
    markShown(uri);
    if (!seen) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  };

  // Remote: { uri, priority }. Local require() images: pass the number as-is.
  const fastSource = remote ? { uri, priority: FastImage.priority.normal } : source;

  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholder]} pointerEvents="none">
      {hasImage ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
          <FastImage
            source={fastSource}
            resizeMode={resizeMode}
            onLoad={onLoad}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.input,
  },
});

export default FillImage;
