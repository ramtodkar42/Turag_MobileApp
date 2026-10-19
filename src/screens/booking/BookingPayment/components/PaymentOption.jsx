import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

// One way to pay: icon, title, hint and a radio. The picked one has a red
// border and a filled radio.
function PaymentOption({ icon, title, subtitle, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon name={icon} size={ms(18)} color={selected ? colors.primary : colors.body} />
      </View>
      <View style={styles.text}>
        <AppText variant="title" color={selected ? colors.primary : colors.heading} style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.dot} /> : null}
      </View>
    </Pressable>
  );
}

const RADIO = ms(20);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.white,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  selected: {
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.9,
  },
  icon: {
    width: ms(36),
    height: ms(36),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.input,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  subtitle: {
    fontSize: fs(11),
    lineHeight: fs(15),
  },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: RADIO / 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: colors.primary,
  },
  dot: {
    width: RADIO / 2,
    height: RADIO / 2,
    borderRadius: RADIO / 4,
    backgroundColor: colors.primary,
  },
});

export default memo(PaymentOption);
