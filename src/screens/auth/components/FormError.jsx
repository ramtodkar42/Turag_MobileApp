import { StyleSheet } from 'react-native';
import { AppText, FadeIn, Icon } from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';

// A sign-in form's error, in a soft red box (nothing when there's no message).
function FormError({ message, style }) {
  if (!message) {
    return null;
  }
  return (
    <FadeIn offset={0} style={[styles.box, style]}>
      <Icon name="close" size={ms(14)} color={colors.danger} strokeWidth={3} />
      <AppText
        variant="caption"
        color={colors.danger}
        accessibilityLiveRegion="polite"
        style={styles.text}
      >
        {message}
      </AppText>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  text: {
    flex: 1,
  },
});

export default FormError;
