import { Pressable, StyleSheet } from 'react-native';
import Icon from '../icons/Icon';
import { colors, shadows } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

const SIZE = ms(52);

// How far above the tab bar the button floats - the same on every screen
// that shows it (Home, inspector Jobs): offset = tab bar space + this.
export const AI_BUTTON_GAP = ms(28);

// The support chat button: the website's chat bubble on a circle in the app's
// red, bottom right on every main page. Opens Turag support. The screen
// decides its position through `style`.
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
      <Icon name="messageCircle" size={ms(24)} color={colors.white} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
});

export default FloatingAIButton;
