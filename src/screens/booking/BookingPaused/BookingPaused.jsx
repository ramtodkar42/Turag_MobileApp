import { StyleSheet, View } from 'react-native';
import { AppText, Button, Header, IconTile, ScreenContainer } from '../../../components';
import { colors, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import { ROUTES } from '../../../navigation/routes';
import { currentHomeRoute } from '../../../navigation/homeRoute';

// Booking an inspector is paused for customers while the product focuses on AI Self
// Inspection (the web's BookingPausedPanel): says so, and offers the way forward
// instead of a dead end.
function BookingPaused({ navigation }) {
  const t = useT();
  return (
    <ScreenContainer scroll header={<Header onBack={navigation.goBack} />}>
      <View style={styles.wrap}>
        <IconTile name="calendar" size={ms(64)} color={colors.primary} backgroundColor={colors.dangerLight} />
        <AppText variant="caption" align="center" color={colors.muted} style={styles.eyebrow}>
          {t('booking.paused.eyebrow')}
        </AppText>
        <AppText variant="h2" align="center">
          {t('booking.paused.heading')}
        </AppText>
        <AppText variant="subtitle" align="center">
          {t('booking.paused.body')}
        </AppText>
        <Button
          title={t('booking.paused.selfInspect')}
          onPress={() => navigation.navigate(ROUTES.EVALUATE_CHAT)}
          style={styles.action}
        />
        <Button
          title={t('booking.paused.garage')}
          variant="outline"
          onPress={() => navigation.navigate(currentHomeRoute(), { screen: ROUTES.GARAGE })}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  eyebrow: {
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.md,
  },
});

export default BookingPaused;
