import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// Frosted top edge of the card: a blurred copy of the photo, aligned with the
// photo behind the card, fading into white. No blur library needed.
function GlassEdge({ source, width, photoHeight, offset, height }) {
  return (
    <View pointerEvents="none" style={[styles.edge, { height }]}>
      <Image
        source={source}
        blurRadius={20}
        resizeMode="cover"
        style={[styles.photo, { top: -offset, width, height: photoHeight }]}
      />
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.1" />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#fade)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
  },
});

export default memo(GlassEdge);
