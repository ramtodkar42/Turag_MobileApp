import { StyleSheet, View } from 'react-native';
import { AppText, IconTile } from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';

// "Inspection - TURAG Verified": the vehicle's verification, in red when it's
// Turag verified, grey otherwise (self-declared, not inspected yet, ...).
function InspectionBanner({ label, verified, style }) {
  const t = useT();
  return (
    <View style={[styles.box, verified ? styles.on : styles.off, style]}>
      <IconTile
        name="shieldCheck"
        size={ms(40)}
        color={colors.white}
        backgroundColor={verified ? colors.primary : colors.placeholder}
      />
      <View style={styles.text}>
        <AppText variant="caption" style={styles.caption}>
          {t('marketplace.details.inspection')}
        </AppText>
        <AppText variant="title" color={verified ? colors.primary : colors.heading} style={styles.label}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  on: {
    borderColor: colors.primary,
    backgroundColor: colors.dangerLight,
  },
  off: {
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  text: {
    flex: 1,
  },
  caption: {
    fontSize: fs(12),
  },
  label: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
});

export default InspectionBanner;
