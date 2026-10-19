import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { colors, radius, spacing } from '../../theme';
import { fs } from '../../utils/responsive';

// Plain, non-interactive value pill (e.g. "Both keys", "Spare Tyre").
function Tag({ label, style }) {
  return (
    <View style={[styles.tag, style]}>
      <AppText variant="label" color={colors.body} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  text: {
    fontSize: fs(12),
    lineHeight: fs(17),
  },
});

export default Tag;
