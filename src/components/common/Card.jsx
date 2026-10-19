import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme';

function Card({ children, padded = true, style }) {
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    ...shadows.md,
  },
  padded: {
    padding: spacing.lg,
  },
});

export default Card;
