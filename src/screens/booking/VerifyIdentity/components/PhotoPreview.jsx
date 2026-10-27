import { StyleSheet, View } from 'react-native';
import { Button, FillImage } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';

// A taken / chosen photo with one button to replace it (Retake / Change).
// square: the selfie (a small square); otherwise a wide document photo.
function PhotoPreview({
  uri,
  square = false,
  actionLabel,
  onAction,
  disabled,
  accessibilityLabel,
}) {
  return (
    <View style={[styles.row, !square && styles.column]}>
      <View
        style={[styles.frame, square ? styles.square : styles.wide]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        <FillImage source={{ uri }} />
      </View>
      <Button
        title={actionLabel}
        variant="outline"
        size="md"
        fullWidth={false}
        disabled={disabled}
        onPress={onAction}
        style={!square && styles.wideButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  column: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  frame: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  square: {
    width: ms(110),
    height: ms(110),
  },
  wide: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  wideButton: {
    alignSelf: 'flex-start',
  },
});

export default PhotoPreview;
