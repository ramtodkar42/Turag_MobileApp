import { StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';

const TONES = {
  success: { bg: colors.successLight, fg: colors.success, icon: 'check' },
  info: { bg: colors.input, fg: colors.heading, icon: 'clock' },
  warning: { bg: colors.warningLight, fg: colors.warning, icon: 'alert' },
  danger: { bg: colors.dangerLight, fg: colors.danger, icon: 'close' },
};

// Where the dealer application stands (or what just happened), as a tinted
// line with an icon. tone: success | info | warning | danger. detail: a second line.
function StatusNote({ tone = 'info', message, detail, style }) {
  const look = TONES[tone] ?? TONES.info;
  return (
    <View style={[styles.box, { backgroundColor: look.bg }, style]} accessibilityRole="text">
      <Icon name={look.icon} size={ms(16)} color={look.fg} strokeWidth={2.2} />
      <View style={styles.flex}>
        <AppText variant="label" color={colors.heading}>
          {message}
        </AppText>
        {detail ? (
          <AppText variant="caption" color={colors.body} style={styles.detail}>
            {detail}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  flex: {
    flex: 1,
  },
  detail: {
    marginTop: spacing.xs,
  },
});

export default StatusNote;
