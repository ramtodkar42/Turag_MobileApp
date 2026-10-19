import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../theme';

// Grey placeholder shape (a line of text, an avatar...). Put inside
// SkeletonPulse. `circle` makes it round using `height`.
function SkeletonBox({ width = '100%', height, circle = false, style }) {
  return (
    <View
      style={[
        styles.box,
        { width: circle ? height : width, height },
        circle && { borderRadius: height / 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.sm / 2,
    backgroundColor: colors.imagePlaceholder,
  },
});

export default SkeletonBox;
