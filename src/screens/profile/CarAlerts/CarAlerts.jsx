import { StyleSheet, View } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Button,
  Card,
  CardListSkeleton,
  FadeIn,
  Header,
  Icon,
  ScreenContainer,
  StatusView,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import useCarAlerts from './useCarAlerts';
import MyAlertsCard from './components/MyAlertsCard';
import AddAlertForm from './components/AddAlertForm';

// Profile > Car alerts (as the web's "WhatsApp car alerts" on the Account
// page): hear on WhatsApp when a new car is listed - every new car, or ones
// matching make / body / fuel / city / budget. Alerts only go out while
// WhatsApp updates are on, so when they're off the page says so and offers to
// turn them on. No route params.
function CarAlerts({ navigation }) {
  const t = useT();
  const alerts = useCarAlerts();
  const {
    loading,
    refreshing,
    error,
    refresh,
    reload,
    whatsappOn,
    busy,
    actionError,
    turnOnWhatsapp,
  } = alerts;
  const header = (
    <Header onBack={navigation.goBack} title={t('profile.item.carAlerts')} />
  );

  if (loading) {
    return (
      <ScreenContainer header={header}>
        <CardListSkeleton cards={[3, 5]} style={styles.top} />
      </ScreenContainer>
    );
  }
  if (error) {
    return (
      <ScreenContainer header={header}>
        <StatusView title={t('carAlerts.error.title')} message={error}>
          <Button
            title={t('common.retry')}
            size="md"
            onPress={reload}
            style={styles.top}
          />
        </StatusView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      header={header}
      scroll
      refreshControl={
        <AppRefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <FadeIn offset={0}>
        <AppText variant="subtitle" style={styles.intro}>
          {t('carAlerts.intro')}
        </AppText>

        {/* No WhatsApp consent: nothing is sent until it's on. */}
        {whatsappOn === false ? (
          <Card style={styles.warning}>
            <View style={styles.warningRow}>
              <Icon name="message" size={ms(18)} color={colors.primary} />
              <AppText
                variant="caption"
                color={colors.heading}
                style={styles.flex}
              >
                {t('carAlerts.whatsappOff')}
              </AppText>
            </View>
            <Button
              title={t('carAlerts.turnOn')}
              size="md"
              variant="outline"
              loading={busy === 'whatsapp'}
              disabled={busy != null}
              onPress={turnOnWhatsapp}
              style={styles.turnOn}
            />
          </Card>
        ) : null}

        <MyAlertsCard alerts={alerts} style={styles.top} />
        {actionError ? (
          <AppText variant="caption" color={colors.danger} style={styles.error}>
            {actionError}
          </AppText>
        ) : null}
        <AddAlertForm alerts={alerts} />
      </FadeIn>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: spacing.sm,
  },
  top: {
    marginTop: spacing.lg,
  },
  warning: {
    marginTop: spacing.lg,
    backgroundColor: colors.dangerLight,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  turnOn: {
    marginTop: spacing.md,
  },
  error: {
    marginTop: spacing.sm,
  },
});

export default CarAlerts;
