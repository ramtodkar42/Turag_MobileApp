import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, spacing, typography } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const TRANSLUCENT_WHITE = 'rgba(255, 255, 255, 0.25)';
const PLACEHOLDER = 'rgba(255, 255, 255, 0.8)';

// White text on red: a solid white selection would hide the selected digits.
// Android paints the highlight in `selectionColor` as-is, so it gets a
// see-through white (cursor + handles stay solid white); iOS fades the
// highlight itself and uses the colour for the cursor.
const SELECTION = Platform.select({
  android: {
    selectionColor: 'rgba(255, 255, 255, 0.35)',
    cursorColor: colors.white,
    selectionHandleColor: colors.white,
  },
  default: { selectionColor: colors.white },
});

// "+91 | Enter your number" on the red login screen. Digits only, max 10.
// onFocus: the box was tapped (the screen can tighten before the keyboard rises).
function PhoneField({ value, onChangeText, error, onSubmitEditing, onFocus, style }) {
  const t = useT();
  return (
    <View style={style}>
      <View style={[styles.box, error && styles.boxError]}>
        <AppText variant="body" color={colors.white}>
          +91
        </AppText>
        <View style={styles.divider} />
        <TextInput
          value={value}
          onChangeText={text => onChangeText(text.replace(/\D/g, '').slice(0, 10))}
          placeholder={t('auth.phonePlaceholder')}
          placeholderTextColor={PLACEHOLDER}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          onFocus={onFocus}
          maxFontSizeMultiplier={1.3}
          {...SELECTION}
          accessibilityLabel={t('auth.phoneLabel')}
          style={styles.input}
        />
      </View>
      {error ? (
        <AppText variant="caption" color={colors.white} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: ms(48),
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: TRANSLUCENT_WHITE,
    borderRadius: radius.sm,
    backgroundColor: TRANSLUCENT_WHITE,
  },
  boxError: {
    borderColor: colors.white,
  },
  divider: {
    width: 1,
    height: ms(20),
    backgroundColor: PLACEHOLDER,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.white,
    paddingVertical: spacing.sm,
  },
  error: {
    marginTop: spacing.xs,
  },
});

export default PhoneField;
