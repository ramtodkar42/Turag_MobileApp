import { Pressable, StyleSheet } from 'react-native';
import SupportBadge from './SupportBadge';
import { shadows } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

const SIZE = ms(44);

// How far above the tab bar the button floats - the same on every screen
// that shows it (Home, inspector Jobs): offset = tab bar space + this.
export const AI_BUTTON_GAP = ms(28);

// The Turag Support button (the same badge as the support chat's header) that
// opens the chat. The screen decides its position through `style`.
function FloatingAIButton({ onPress, style }) {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('common.openAssistant')}
      hitSlop={ms(8)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <SupportBadge size={SIZE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: SIZE * 0.28,
    ...shadows.md,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
});

export default FloatingAIButton;
