import { StyleSheet, View } from 'react-native';
import { AppText, Button, FadeIn, IconTile } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const FIELD_KEYS = {
  MAKE: 'selfInspection.mismatch.make',
  MODEL: 'selfInspection.mismatch.model',
  CHASSIS: 'selfInspection.mismatch.chassis',
  REGISTRATION: 'selfInspection.mismatch.registration',
};

// The RC or chassis read doesn't match this vehicle. A warning only: a bad read must not
// strand a genuine car, and QC checks the same thing before approving. Shown above the
// steps, because the RC and VIN cards move on by themselves once saved.
// fields: ['MAKE' | 'MODEL' | 'CHASSIS' | 'REGISTRATION'] ([] shows nothing; make and
// model come from the inspector's checks); vehicle: its make and model;
// onCheck(field): opens the card of the first field named.
function IdentityMismatchBanner({ fields, vehicle, onCheck, style }) {
  const t = useT();
  if (fields.length === 0) return null;
  const names = fields.map(field => t(FIELD_KEYS[field])).join(', ');
  return (
    <FadeIn offset={0} style={[styles.banner, style]}>
      <IconTile name="document" size={ms(32)} color={colors.danger} backgroundColor={colors.white} />
      <View style={styles.text} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <AppText variant="label" color={colors.heading}>
          {t('selfInspection.mismatch.title')}
        </AppText>
        <AppText variant="caption" color={colors.body}>
          {t(fields.length === 1 ? 'selfInspection.mismatch.bodyOne' : 'selfInspection.mismatch.bodyMany', {
            fields: names,
            vehicle: vehicle || t('selfInspection.yourVehicle'),
          })}
        </AppText>
        <Button
          title={t('selfInspection.mismatch.check')}
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => onCheck(fields[0])}
          style={styles.check}
        />
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  check: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },
});

export default IdentityMismatchBanner;
