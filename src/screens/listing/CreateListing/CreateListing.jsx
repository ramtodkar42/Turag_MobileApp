import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  CheckRow,
  Header,
  HeaderCard,
  InfoNote,
  ScreenContainer,
  TextField,
  TitledCard,
  ValueCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatINR, formatNumber } from '../../../utils/format';
import { newIdempotencyKey } from '../../../api/client';
import { createListing } from '../../../api/services/sellerListing.api';
import { loadGarage } from '../../../store/garageStore';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import LocationSection from './components/LocationSection';
import useListingLocation from './useListingLocation';

const MAX_PRICE_DIGITS = 9; // up to ₹99,99,99,999
const MAX_NOTE = 2000; // backend limit

// List a valued Garage vehicle (as the web's listing form): asking price
// (starts at the estimate - guidance, not a limit), an optional note to
// buyers, where the vehicle is (city + state required), and the ownership
// attestation. Creates a DRAFT, then opens it so the seller can submit it for review.
// params: { vehicle } (Garage vehicle: vehicleId, valuationId, inspectionId?, estimatedValue)
function CreateListing({ navigation, route }) {
  const t = useT();
  const { vehicle } = route.params;
  const estimate = vehicle.estimatedValue ?? null;
  const [price, setPriceDigits] = useState(estimate ? String(estimate) : '');
  const [touched, setTouched] = useState(false);
  const [note, setNote] = useState('');
  const [attested, setAttested] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  // Where the vehicle is: city + state are required by the backend.
  const location = useListingLocation();
  const [showLocationErrors, setShowLocationErrors] = useState(false);
  // One key per listing attempt ({ attempt, value }): a retry after a network
  // error can't create two.
  const key = useRef(null);
  const name = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ');

  const setPrice = text => {
    setPriceDigits(text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_PRICE_DIGITS));
    setTouched(true);
    setError('');
  };

  // Mirror the web's create-time gate (ADR-0038): a vehicle is listable only
  // with a valid valuation AND an eligible (completed) inspection. The Garage
  // already routes only eligible vehicles here; we re-check so stale data can't
  // submit a request the backend would reject.
  const eligible = !!vehicle.inspectionEligible;
  const priceValid = Number(price) > 0;
  const canCreate = priceValid && attested && !!vehicle.valuationId && eligible;

  const onCreate = async () => {
    if (creating) {
      return;
    }
    // As the web: the button stays tappable and says what's missing.
    if (!location.complete) {
      setShowLocationErrors(true);
      return;
    }
    // The same key only for a retry of exactly the same listing; after any
    // change (price, note, location) it's a new attempt with a new key.
    const payload = location.toPayload();
    const attempt = JSON.stringify([Number(price), note, payload]);
    if (key.current?.attempt !== attempt) {
      key.current = { attempt, value: newIdempotencyKey() };
    }
    setCreating(true);
    setError('');
    try {
      const listing = await createListing({
        vehicleId: vehicle.vehicleId,
        valuationId: vehicle.valuationId,
        inspectionId: vehicle.inspectionId ?? null,
        askPrice: Number(price),
        sellerNote: note,
        location: payload,
        idempotencyKey: key.current.value,
        vehicle,
      });
      loadGarage();
      navigation.replace(ROUTES.MY_LISTING, { listingId: listing.id });
    } catch (e) {
      setError(e.message || t('selling.create.error'));
      setCreating(false);
    }
  };

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} />}
      footer={
        <Button title={t('selling.create.submit')} onPress={onCreate} disabled={!canCreate} loading={creating} />
      }
    >
      <HeaderCard
        title={t('selling.create.title')}
        subtitle={t('selling.create.subtitle')}
        style={styles.card}
      />

      {/* Safety net: the Garage only routes eligible vehicles here, but if a
          vehicle lost eligibility (e.g. its inspection/valuation lapsed) we say
          why rather than letting the backend reject the create. */}
      {!eligible ? (
        <InfoNote style={styles.card}>{t('selling.create.needsInspection')}</InfoNote>
      ) : null}

      <ValueCard
        label={t('selling.create.estimate')}
        value={estimate != null ? `${formatINR(estimate)}/-` : '—'}
        title={name}
        description={t('selling.create.guidance')}
        style={styles.card}
      />

      <View style={styles.fields}>
        <TextField
          label={t('selling.create.price')}
          placeholder={t('selling.create.pricePlaceholder')}
          value={formatNumber(price)}
          onChangeText={setPrice}
          valid={priceValid}
          error={touched && price === '' ? t('selling.create.priceError') : ''}
          left={
            <AppText variant="body" color={colors.heading}>
              ₹
            </AppText>
          }
          keyboardType="number-pad"
          returnKeyType="done"
        />
        {estimate != null ? (
          <AppText variant="caption" style={styles.help}>
            {t('selling.create.priceHelp', { amount: formatINR(estimate) })}
          </AppText>
        ) : null}
        <TextField
          label={t('selling.create.note')}
          optional
          multiline
          placeholder={t('selling.create.notePlaceholder')}
          value={note}
          onChangeText={setNote}
          maxLength={MAX_NOTE}
        />
      </View>

      <LocationSection form={location} showErrors={showLocationErrors} style={styles.section} />

      <TitledCard title={t('selling.create.ownershipTitle')} style={styles.card}>
        <AppText variant="caption" color={colors.body} style={styles.ownership}>
          {t('selling.create.ownershipBody')}
        </AppText>
        <CheckRow
          label={t('selling.create.ownershipCheck')}
          checked={attested}
          onToggle={() => setAttested(a => !a)}
          style={styles.check}
        />
      </TitledCard>

      <InfoNote style={styles.card}>{t('selling.create.moderationNote')}</InfoNote>

      {showLocationErrors && !location.complete ? (
        <AppText variant="caption" color={colors.danger} style={styles.card}>
          {t('selling.create.location.missing')}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.card}>
          {error}
        </AppText>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  fields: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
  },
  help: {
    marginTop: -spacing.sm,
  },
  ownership: {
    marginTop: spacing.sm,
    fontSize: fs(12),
    lineHeight: fs(18),
  },
  check: {
    marginTop: spacing.md,
  },
});

export default CreateListing;
