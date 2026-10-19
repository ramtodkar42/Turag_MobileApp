import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { ms } from '../../utils/responsive';

// Carousel indicator (intro slides, vehicle image gallery).
function PaginationDots({
  count,
  activeIndex = 0,
  activeColor = colors.white,
  inactiveColor = colors.placeholder,
  style,
}) {
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i === activeIndex ? activeColor : inactiveColor },
          ]}
        />
      ))}
    </View>
  );
}

const DOT = ms(6);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
});

export default PaginationDots;
