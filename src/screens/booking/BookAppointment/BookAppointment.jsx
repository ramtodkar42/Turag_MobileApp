import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  CardListSkeleton,
  CheckRow,
  ChoiceChip,
  Header,
  HeaderCard,
  InfoNote,
  ScreenContainer,
  TitledCard,
} from '../../../components';
import { spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { formatRegNumber } from '../../../utils/validators';
import useRemoteData from '../../../hooks/useRemoteData';
import { getBookingSlots } from '../../../api/services/booking.api';
import { checkServiceability } from '../../../api/services/serviceArea.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { comingSoonPlace } from '../comingSoonPlace';
import AddressFields from './components/AddressFields';
import PaymentsSoonCard from './components/PaymentsSoonCard';
import SlotPicker from './components/SlotPicker';
import { BOOKING_CATEGORIES, PREPARATION } from './constants';
import useBookingForm from './useBookingForm';

// Book a doorstep inspection (as the web's /book page): vehicle type, a date
// and time the backend offers, where the vehicle will be (typed for this
// booking, as on the web - addresses aren't saved separately), and what's
// ready on the day. The fee is paid after the summary, to confirm the booking.
// params: { vehicle?, valuation? } - from the Evaluate flow / Garage
// (vehicle known) or My inspections (choose the vehicle type).
function BookAppointment({ navigation, route }) {
  const t = useT();
  const { vehicle, valuation } = route.params ?? {};
  const { data: slots, loading, error, reload } = useRemoteData(getBookingSlots);
  const form = useBookingForm({ vehicle, slots });
  const [checking, setChecking] = useState(false);
  // Slots and price are real, but no live payment gateway yet (as the web).
  const paymentsSoon = !!slots && slots.enabled && !slots.paymentsAvailable;

  // Continue: first ask the server whether doorstep inspections are offered at
  // this address (as the web, before checkout). Not yet: "Coming soon to <city>",
  // where the user can ask to be told when Turag launches there.
  const onContinue = async () => {
    if (checking) {
      return;
    }
    const { address } = form;
    setChecking(true);
    const serviceable = await checkServiceability({ city: address.city, pincode: address.pincode });
    setChecking(false);
    if (!serviceable) {
      navigation.navigate(ROUTES.BOOKING_COMING_SOON, {
        place: comingSoonPlace(address),
        category: form.category,
        vehicleId: vehicle?.vehicleId ?? null,
        slotAt: form.slot?.slotAt ?? null,
      });
      return;
    }
    navigation.navigate(ROUTES.BOOKING_SUMMARY, {
      vehicle: vehicle ?? null,
      valuation: valuation ?? null,
      category: form.category,
      address,
      slot: form.slot,
      preparation: form.preparation,
      price: slots.price,
    });
  };

  let slotsBody;
  if (loading) {
    slotsBody = <CardListSkeleton cards={[2]} style={styles.inner} />;
  } else if (error) {
    slotsBody = (
      <View style={styles.inner}>
        <AppText variant="subtitle">{t('booking.slots.loadError')}</AppText>
        <Button title={t('common.retry')} size="sm" variant="outline" onPress={reload} style={styles.retry} />
      </View>
    );
  } else if (!slots.enabled) {
    slotsBody = <InfoNote style={styles.inner}>{t('booking.slots.unavailable')}</InfoNote>;
  } else {
    slotsBody = (
      <View style={styles.inner}>
        <SlotPicker
          days={slots.days}
          dayKey={form.dayKey}
          slotAt={form.slot?.slotAt}
          onDayChange={form.changeDay}
          onSlotChange={form.setSlot}
        />
      </View>
    );
  }

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} />}
      footer={
        <View>
          {slots?.price != null ? (
            <AppText variant="caption" align="center" style={styles.payLater}>
              {t('booking.feeNow', { amount: formatINR(slots.price) })}
            </AppText>
          ) : null}
          <Button title={t('common.continue')} onPress={onContinue} disabled={!form.ready} loading={checking} />
        </View>
      }
    >
      <HeaderCard
        title={t('booking.appointment.title')}
        subtitle={t('booking.appointment.subtitle')}
        style={styles.card}
      />

      {paymentsSoon ? (
        <PaymentsSoonCard
          onInspectYourself={() => navigation.navigate(ROUTES.EVALUATE_CHAT)}
          style={styles.card}
        />
      ) : null}

      {/* 1 · Vehicle */}
      <TitledCard title={t('booking.section.vehicle')} style={styles.card}>
        {vehicle ? (
          <View style={styles.inner}>
            <AppText variant="h3" style={styles.vehicleName}>
              {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}
            </AppText>
            <AppText variant="caption">
              {[
                vehicle.registrationNumber ? formatRegNumber(vehicle.registrationNumber) : null,
                t(`booking.category.${form.category}`),
                t(`booking.category.${form.category}_info`),
              ]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          </View>
        ) : (
          <View style={[styles.inner, styles.row]}>
            {BOOKING_CATEGORIES.map(option => (
              <View key={option.value} style={styles.flex}>
                <ChoiceChip
                  label={t(option.labelKey)}
                  selected={form.category === option.value}
                  onPress={() => form.setCategory(option.value)}
                />
                <AppText variant="caption" align="center" style={styles.categoryInfo}>
                  {t(option.infoKey)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </TitledCard>

      {/* 2 · Date and time */}
      <TitledCard title={t('booking.section.time')} style={styles.card}>
        {slotsBody}
      </TitledCard>

      {/* 3 · Where the vehicle will be */}
      <TitledCard title={t('booking.section.where')} style={styles.card}>
        <AppText variant="caption" style={styles.hint}>
          {t('booking.where.hint')}
        </AppText>
        <AddressFields
          form={form.addressForm}
          geo={form.geo}
          location={form.location}
          style={styles.inner}
        />
      </TitledCard>

      {/* 4 · On the day */}
      <TitledCard title={t('booking.section.onTheDay')} style={styles.card}>
        <View style={[styles.inner, styles.preparation]}>
          {PREPARATION.map(item => (
            <View key={item.key}>
              <CheckRow
                label={t(item.labelKey)}
                checked={form.preparation[item.key]}
                onToggle={() => form.togglePreparation(item.key)}
              />
              <AppText variant="caption" style={styles.help}>
                {t(item.helpKey)}
              </AppText>
            </View>
          ))}
        </View>
      </TitledCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  inner: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  vehicleName: {
    fontSize: fs(17),
    lineHeight: fs(23),
  },
  categoryInfo: {
    marginTop: spacing.xs,
  },
  hint: {
    marginTop: spacing.xxs,
  },
  preparation: {
    gap: spacing.md,
  },
  help: {
    marginTop: spacing.xxs,
    marginLeft: spacing.xl + spacing.xxs,
    fontSize: fs(11),
    lineHeight: fs(15),
  },
  retry: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  payLater: {
    marginBottom: spacing.sm,
  },
});

export default BookAppointment;
