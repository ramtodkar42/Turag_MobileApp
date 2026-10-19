import { Pressable, StyleSheet } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

// Grey rounded line of text. Tappable when `onPress` is given.
function SuggestionPill({ text, onPress }) {
  return (
    <Pressable
      onPress={onPress ? () => onPress(text) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <AppText variant="caption" align="center" color={colors.body} style={styles.text}>
        {text}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    width: '85%',
    maxWidth: ms(320),
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.imagePlaceholder,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    fontSize: fs(12),
    lineHeight: fs(17),
  },
});

export default SuggestionPill;
