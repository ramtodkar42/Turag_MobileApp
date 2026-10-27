import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText, Card, Divider, Spinner } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { lakhs } from '../constants';

// "Hyundai · SUV · Diesel · Pune · under ₹10 lakh", or "Any car".
const describe = (alert, t) => {
  const parts = [
    alert.make,
    alert.model,
    alert.bodyType && t(`carAlerts.body.${alert.bodyType}`),
    alert.fuel && t(`carAlerts.fuel.${alert.fuel}`),
    alert.city && t(`carAlerts.city.${alert.city}`),
    alert.priceMaxMinor != null &&
      t('carAlerts.under', { amount: lakhs(alert.priceMaxMinor / 100) }),
    alert.yearMin != null && t('carAlerts.yearMin', { year: alert.yearMin }),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : t('carAlerts.anyCar');
};

// The "All new cars" switch, then the matching alerts, each with Remove.
// alerts: from useCarAlerts (allAlert, matching, toggleAll, removeAlert, busy).
function MyAlertsCard({ alerts, style }) {
  const t = useT();
  const { allAlert, matching, toggleAll, removeAlert, busy } = alerts;

  return (
    <Card style={style}>
      <View style={styles.allRow}>
        <View style={styles.flex}>
          <AppText variant="title">{t('carAlerts.all.title')}</AppText>
          <AppText variant="caption" style={styles.sub}>
            {t('carAlerts.all.sub')}
          </AppText>
        </View>
        <Switch
          value={!!allAlert}
          onValueChange={toggleAll}
          disabled={busy != null}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.border}
          accessibilityLabel={t('carAlerts.all.title')}
        />
      </View>

      <Divider style={styles.divider} />

      <AppText variant="title">{t('carAlerts.mine.title')}</AppText>
      {matching.length === 0 ? (
        <AppText variant="caption" style={styles.sub}>
          {t('carAlerts.mine.empty')}
        </AppText>
      ) : (
        matching.map((alert, i) => (
          <View
            key={alert.id}
            style={[styles.alertRow, i > 0 && styles.alertBorder]}
          >
            <AppText variant="body" color={colors.heading} style={styles.flex}>
              {describe(alert, t)}
            </AppText>
            {busy === alert.id ? (
              <Spinner size={ms(20)} />
            ) : (
              <Pressable
                onPress={() => removeAlert(alert.id)}
                disabled={busy != null}
                accessibilityRole="button"
                hitSlop={ms(8)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <AppText variant="label" color={colors.primary}>
                  {t('carAlerts.remove')}
                </AppText>
              </Pressable>
            )}
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  sub: {
    marginTop: spacing.xs,
  },
  divider: {
    marginVertical: spacing.md,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  alertBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default MyAlertsCard;
