import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  CheckCircle,
  Header,
  Icon,
  PopIn,
  ScreenContainer,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { notifyCityLaunch } from '../../../api/services/serviceArea.api';
import { useT } from '../../../i18n';

const CIRCLE = ms(88);
const TEXT_WIDTH = ms(340);

// "We're coming soon to <city>" (as the web's ComingSoonPanel): the booking
// address is in a city Turag doesn't serve yet (the server decides; the app
// never names the cities it does serve). Instead of booking, the user can opt
// in to be told when Turag launches there; "Back to booking" returns to the
// form as it was, to try another address.
// params: { place: { city, locality?, state?, pincode? }, category, vehicleId?, slotAt?,
// backTo? (opened from the summary: back goes to the booking form itself) }
function BookingComingSoon({ navigation, route }) {
  const t = useT();
  const { place, category, vehicleId, slotAt, backTo } = route.params;
  const back = () => (backTo ? navigation.popTo(backTo) : navigation.goBack());
  const city = place.city;
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'done' | 'error'
  const done = status === 'done';

  const notify = async () => {
    if (status === 'saving') {
      return;
    }
    setStatus('saving');
    try {
      await notifyCityLaunch({ ...place, category, vehicleId, slotAt });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={back} />}
      footer={
        done ? (
          <Button
            title={t('booking.comingSoon.back')}
            variant="outline"
            onPress={back}
          />
        ) : (
          <View>
            <Button
              title={t(
                status === 'saving'
                  ? 'booking.comingSoon.saving'
                  : 'booking.comingSoon.notify',
              )}
              leftIcon={<Icon name="bell" size={ms(18)} color={colors.white} />}
              loading={status === 'saving'}
              onPress={notify}
            />
            <AppText variant="caption" align="center" style={styles.consent}>
              {t('booking.comingSoon.consent')}
            </AppText>
            <Button
              title={t('booking.comingSoon.back')}
              variant="ghost"
              onPress={back}
              style={styles.back}
            />
          </View>
        )
      }
    >
      <View style={styles.body}>
        {done ? (
          <PopIn>
            <CheckCircle size={CIRCLE} />
          </PopIn>
        ) : (
          <View style={styles.circle}>
            <Icon name="mapPin" size={ms(38)} color={colors.primary} />
          </View>
        )}

        {done ? null : (
          <AppText
            variant="label"
            color={colors.primary}
            align="center"
            style={styles.eyebrow}
          >
            {t('booking.comingSoon.eyebrow')}
          </AppText>
        )}
        <AppText variant="h3" align="center" style={styles.heading}>
          {done
            ? t('booking.comingSoon.doneTitle')
            : t('booking.comingSoon.heading', { city })}
        </AppText>
        <AppText variant="subtitle" align="center" style={styles.message}>
          {done
            ? t('booking.comingSoon.doneBody', { city })
            : t('booking.comingSoon.body', { city })}
        </AppText>

        {status === 'error' ? (
          <AppText
            variant="caption"
            color={colors.danger}
            align="center"
            style={styles.message}
          >
            {t('booking.comingSoon.error')}
          </AppText>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  eyebrow: {
    marginTop: spacing.xl,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heading: {
    marginTop: spacing.sm,
    maxWidth: TEXT_WIDTH,
    fontSize: fs(22),
    lineHeight: fs(29),
  },
  message: {
    marginTop: spacing.sm,
    maxWidth: TEXT_WIDTH,
  },
  consent: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  back: {
    marginTop: spacing.xs,
  },
});

export default BookingComingSoon;
