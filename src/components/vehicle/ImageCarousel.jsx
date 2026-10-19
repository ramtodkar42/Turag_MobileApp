import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import FillImage from '../common/FillImage';
import PaginationDots from '../common/PaginationDots';
import VehicleImage from './VehicleImage';
import { colors, radius, spacing } from '../../theme';

const VIEWABILITY = { itemVisiblePercentThreshold: 50 };

// Swipeable photo gallery with dots and optional corner items (e.g. back
// button top-left, bookmark top-right, "Verified" bottom-left). Falls back to
// the "No Image" frame when there are no photos.
// rounded: rounded corners (false for an edge-to-edge photo).
// dotsBelow: red / grey dots under the photo instead of white ones on it.
// cornerInset: extra top space for the top corners (e.g. the status bar).
function ImageCarousel({
  images = [],
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  aspectRatio = 1.35,
  rounded = true,
  dotsBelow = false,
  cornerInset = 0,
  style,
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]?.index != null) {
      setIndex(viewableItems[0].index);
    }
  }).current;

  const renderItem = useCallback(
    ({ item }) => (
      <View style={{ width, height: width / aspectRatio }}>
        <FillImage source={item} />
      </View>
    ),
    [width, aspectRatio],
  );

  const top = { top: spacing.sm + cornerInset };
  const dots =
    images.length > 1 ? (
      <PaginationDots
        count={images.length}
        activeIndex={index}
        activeColor={dotsBelow ? colors.primary : colors.white}
        inactiveColor={dotsBelow ? colors.dangerLight : colors.placeholder}
        style={dotsBelow ? styles.dotsBelow : styles.dots}
      />
    ) : null;

  return (
    <View style={style}>
      <View
        style={[styles.frame, rounded && styles.rounded, { aspectRatio }]}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
      >
        {images.length === 0 ? (
          <VehicleImage source={null} style={StyleSheet.absoluteFill} />
        ) : width > 0 ? (
          <FlatList
            data={images}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          />
        ) : null}

        {dotsBelow ? null : dots}
        {topLeft ? <View style={[styles.topLeft, top]}>{topLeft}</View> : null}
        {topRight ? <View style={[styles.topRight, top]}>{topRight}</View> : null}
        {bottomLeft ? <View style={styles.bottomLeft}>{bottomLeft}</View> : null}
        {bottomRight ? <View style={styles.bottomRight}>{bottomRight}</View> : null}
      </View>
      {dotsBelow ? dots : null}
    </View>
  );
}

const CORNER = spacing.sm;

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.input,
  },
  rounded: {
    borderRadius: radius.lg,
  },
  dots: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
  },
  dotsBelow: {
    marginTop: spacing.sm,
  },
  topLeft: {
    position: 'absolute',
    left: CORNER,
  },
  topRight: {
    position: 'absolute',
    right: CORNER,
  },
  bottomLeft: {
    position: 'absolute',
    left: CORNER,
    bottom: CORNER,
  },
  bottomRight: {
    position: 'absolute',
    right: CORNER,
    bottom: CORNER,
  },
});

export default ImageCarousel;
