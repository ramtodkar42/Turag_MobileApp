import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import AppText from './AppText';
import { colors, radius, spacing } from '../../theme';
import { ms } from '../../utils/responsive';

// One hidden input behind the boxes: supports paste and SMS autofill.
function OTPInput({ length = 4, value = '', onChangeText, autoFocus = true, style }) {
  const inputRef = useRef(null);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const handleChange = text => onChangeText?.(text.replace(/\D/g, '').slice(0, length));

  return (
    <Pressable
      style={[styles.row, length > 4 && styles.rowTight, style]}
      onPress={() => inputRef.current?.focus()}
    >
      {digits.map((digit, i) => (
        <View
          key={i}
          style={[styles.box, (digit || i === value.length) && styles.boxActive]}
        >
          <AppText variant="h2">{digit}</AppText>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  // 6 boxes need a smaller gap to fit small phones.
  rowTight: {
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    maxWidth: ms(64),
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  boxActive: {
    borderColor: colors.heading,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
  },
});

export default OTPInput;
