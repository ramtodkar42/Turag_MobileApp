import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { colors, spacing } from '../../theme';
import { HIT_SLOP } from '../../constants/layout';

// Section title with an optional text action on the right ("Clear all", "See all").
function SectionHeader({ title, variant = 'title', actionLabel, onAction, style, titleStyle }) {
  return (
    <View style={[styles.row, style]}>
      <AppText variant={variant} style={[styles.title, titleStyle]}>
        {title}
      </AppText>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={HIT_SLOP} accessibilityRole="button">
          <AppText variant="label" color={colors.body}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
});

export default SectionHeader;
