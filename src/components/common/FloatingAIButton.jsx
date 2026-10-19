import { Pressable, StyleSheet } from 'react-native';
import TuragLogo from './TuragLogo';
import { radius, shadows } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// TURAG.AI logo button that opens the AI assistant.
// The screen decides its position through `style`.
function FloatingAIButton({ onPress, style }) {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('common.openAssistant')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <TuragLogo height={ms(32)} ratio={1.75} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    ...shadows.md,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
});

export default FloatingAIButton;
