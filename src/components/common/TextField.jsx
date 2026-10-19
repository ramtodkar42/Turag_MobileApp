import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import AppText from './AppText';
import CheckCircle from './CheckCircle';
import EyeIcon from '../icons/EyeIcon';
import { colors, radius, spacing, typography } from '../../theme';
import { HIT_SLOP } from '../../constants/layout';
import { fs, ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// variant "outline": pill with label on the border (most forms)
// variant "underline": label above, line below (Create Account)
// readOnly: shows a value that can't be edited, without the grey disabled look
// multiline: tall rounded box, text starts top-left (notes / instructions)
// optional: adds a small "(Optional)" after the label
function TextField({
  ref,
  label,
  error,
  valid = false,
  secureTextEntry = false,
  variant = 'outline',
  left,
  right,
  editable = true,
  readOnly = false,
  multiline = false,
  optional = false,
  onFocus,
  onBlur,
  style,
  inputStyle,
  ...inputProps
}) {
  const t = useT();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);
  const isOutline = variant === 'outline';

  const borderColor = error ? colors.danger : focused ? colors.heading : colors.border;

  const passwordToggle = secureTextEntry ? (
    <Pressable
      onPress={() => setHidden(h => !h)}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={hidden ? t('common.showPassword') : t('common.hidePassword')}
    >
      <EyeIcon off={!hidden} />
    </Pressable>
  ) : null;

  const trailing = right ?? passwordToggle ?? (valid ? <CheckCircle /> : null);

  return (
    <View style={[isOutline && label && styles.outlineSpacing, style]}>
      {!isOutline && label ? <AppText variant="caption">{label}</AppText> : null}

      <View
        style={[
          isOutline ? styles.outline : styles.underline,
          isOutline && multiline && styles.multiline,
          { borderColor },
          !editable && !readOnly && styles.disabled,
        ]}
      >
        {isOutline && label ? (
          <AppText
            variant="caption"
            color={colors.body}
            numberOfLines={1}
            style={styles.floatingLabel}
          >
            {label}
            {optional ? (
              <AppText variant="caption" style={styles.optional}>
                {' '}
                (Optional)
              </AppText>
            ) : null}
          </AppText>
        ) : null}
        {left}
        <TextInput
          ref={ref}
          editable={editable && !readOnly}
          secureTextEntry={hidden}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          placeholderTextColor={colors.placeholder}
          maxFontSizeMultiplier={1.3}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.multilineInput, inputStyle]}
          {...inputProps}
        />
        {trailing}
      </View>

      {error ? (
        <AppText
          variant="caption"
          color={colors.danger}
          style={[styles.error, isOutline && styles.errorOutline]}
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outlineSpacing: {
    paddingTop: spacing.sm,
  },
  outline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: ms(48),
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  multiline: {
    alignItems: 'flex-start',
    minHeight: ms(110),
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  multilineInput: {
    alignSelf: 'stretch',
    minHeight: ms(90),
  },
  optional: {
    fontSize: fs(9),
  },
  underline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: ms(40),
    borderBottomWidth: 1,
  },
  floatingLabel: {
    position: 'absolute',
    top: -ms(9),
    left: spacing.lg,
    // Long labels stay inside the border (ellipsised) instead of running off screen.
    maxWidth: '85%',
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.white,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.heading,
    paddingVertical: spacing.sm,
  },
  disabled: {
    backgroundColor: colors.input,
  },
  error: {
    marginTop: spacing.xs,
  },
  errorOutline: {
    marginLeft: spacing.lg,
  },
});

export default TextField;
