import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Header, IconTile, InspectionConsent, ScreenContainer, TextField } from '../../../components';
import { colors, fonts, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatRegNumber, isValidRegNumber, normalizeRegNumber } from '../../../utils/validators';
import { supportsSelfInspection } from '../../../api/mappers/valuation';
import { ApiError } from '../../../api/client';
import { confirmVehicle, proposeVehicle, startSelfInspection } from '../../../api/services/valuation.api';
import { findOpenSelfInspection, saveToGarage } from '../../../store/garageStore';
import { selfInspectionParams } from '../../garage/garagePhase';
import { FEATURES } from '../../../api/config';
import { ROUTES } from '../../../navigation/routes';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { useT } from '../../../i18n';
import { toDetailRows } from '../../valuation/components/vehicleRows';

const VEHICLE_ROWS = 4;

// "List a vehicle" (dealer + seller; the web's /sell/start): the registration number,
// the registry's vehicle, then straight into an AI Self Inspection with no valuation
// first. Once it's reviewed, the vehicle can be listed from the Garage. The registry
// read saves nothing; "AI Self Inspection" confirms the vehicle, saves it to the
// Garage (so the inspection can be resumed there) and starts the inspection.
function ListVehicleStart({ navigation }) {
  const t = useT();
  const [plate, setPlate] = useState('');
  const [plateError, setPlateError] = useState('');
  const [looking, setLooking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [vehicle, setVehicle] = useState(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [noRead, setNoRead] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const busy = looking || starting;
  const canSelfInspect = vehicle ? supportsSelfInspection(vehicle) : false;

  const openPolicy = () =>
    navigation.navigate(ROUTES.WEB_PAGE, { title: t('profile.item.privacyPolicy'), path: '/privacy_policy' });

  const find = async () => {
    if (busy) return;
    const number = normalizeRegNumber(plate);
    if (!number) {
      setPlateError(t('selling.start.plateRequired'));
      return;
    }
    if (!isValidRegNumber(number)) {
      setPlateError(t('valuation.evaluate.invalidPlate'));
      return;
    }
    setPlateError('');
    setError('');
    setNoRead(false);
    setLooking(true);
    try {
      setVehicle(await proposeVehicle(number));
    } catch (e) {
      if (e?.status === 404) {
        setNoRead(true);
      } else if (e?.code === 'INVALID_PLATE') {
        setPlateError(e.message);
      } else {
        setError(e?.message || t('selling.start.error'));
      }
    } finally {
      setLooking(false);
    }
  };

  const start = async () => {
    // Never starts (or claims consent) unless the box is ticked (Privacy Policy 6.4).
    if (!consent || busy) return;
    setStarting(true);
    setError('');
    try {
      const confirmed = await confirmVehicle(vehicle.registrationNumber);
      // Never a second one: a self-inspection still open for this vehicle is
      // continued (a new one would hide it - the Garage shows only the newest).
      const open = await findOpenSelfInspection(confirmed.vehicleId);
      if (open) {
        navigation.replace(ROUTES.SELF_INSPECTION, selfInspectionParams(open, { resumed: true }));
        return;
      }
      try {
        await saveToGarage({ vehicle: confirmed, valuation: null });
      } catch (e) {
        // Not blocking: QC adds the vehicle to the Garage later; only resuming from
        // there before then is lost. Signed out or Terms owed still stop here.
        if (e instanceof ApiError && (e.status === 401 || e.code === 'CONSENT_REQUIRED')) throw e;
      }
      const { inspectionId } = await startSelfInspection({
        vehicleId: confirmed.vehicleId,
        category: confirmed.category,
        consent,
      });
      navigation.replace(ROUTES.SELF_INSPECTION, { inspectionId, vehicle: confirmed, valuation: null });
    } catch (e) {
      setError(e?.message || t('selling.start.error'));
      setStarting(false);
    }
  };

  const changeVehicle = () => {
    setVehicle(null);
    setConsent(false);
    setError('');
  };

  const bookInspector = () => {
    if (FEATURES.inspectorBooking) {
      navigation.navigate(ROUTES.BOOK_APPOINTMENT, { vehicle });
    } else {
      confirm({
        icon: <IconTile name="clock" size={ms(52)} />,
        title: t('booking.paused.heading'),
        message: t(canSelfInspect ? 'selling.start.bookSoonBody' : 'valuation.self.carsOnly'),
        confirmLabel: t('common.ok'),
        cancelLabel: null,
      });
    }
  };

  const errorText = error ? (
    <AppText variant="caption" color={colors.danger}>
      {error}
    </AppText>
  ) : null;

  return (
    <ScreenContainer scroll header={<Header onBack={navigation.goBack} title={t('selling.start.title')} />}>
      <AppText variant="subtitle" style={styles.intro}>
        {t('selling.start.intro')}
      </AppText>

      {vehicle ? (
        <Card style={styles.card}>
          <AppText variant="caption" color={colors.muted}>
            {t('selling.start.found')}
          </AppText>
          <AppText style={styles.name}>{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}</AppText>
          <AppText variant="label" color={colors.heading}>
            {formatRegNumber(vehicle.registrationNumber)}
          </AppText>
          <View style={styles.rows}>
            {toDetailRows(vehicle, t)
              .slice(0, VEHICLE_ROWS)
              .map(row => (
                <AppText key={row.label} variant="caption">{`${row.label}: ${row.value}`}</AppText>
              ))}
          </View>
          {canSelfInspect ? (
            <InspectionConsent checked={consent} onToggle={() => setConsent(c => !c)} onOpenPolicy={openPolicy} />
          ) : (
            <AppText variant="caption">{t('valuation.self.carsOnly')}</AppText>
          )}
          <View style={styles.actions}>
            {canSelfInspect ? (
              <Button
                title={t(starting ? 'selling.start.starting' : 'valuation.mode.self')}
                loading={starting}
                disabled={!consent || busy}
                onPress={start}
              />
            ) : null}
            <Button title={t('selling.start.bookInspector')} variant="outline" disabled={busy} onPress={bookInspector} />
          </View>
          {errorText}
          <Pressable onPress={changeVehicle} disabled={busy} accessibilityRole="button" hitSlop={8}>
            <AppText style={styles.link}>{t('selling.start.notMine')}</AppText>
          </Pressable>
        </Card>
      ) : (
        <View style={styles.card}>
          <TextField
            label={t('valuation.evaluate.regLabel')}
            placeholder={t('valuation.evaluate.regPlaceholder')}
            autoCapitalize="characters"
            autoCorrect={false}
            value={plate}
            error={plateError}
            returnKeyType="search"
            onChangeText={value => {
              setPlate(value.toUpperCase());
              setPlateError('');
            }}
            onSubmitEditing={find}
          />
          <Button title={t(looking ? 'selling.start.looking' : 'selling.start.find')} loading={looking} onPress={find} />
          {noRead ? (
            <View style={styles.noRead}>
              <AppText variant="caption">{t('selling.start.noRead')}</AppText>
              <Pressable
                onPress={() => navigation.navigate(ROUTES.EVALUATE_CHAT)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <AppText style={styles.link}>{t('selling.start.manual')}</AppText>
              </Pressable>
            </View>
          ) : null}
          {errorText}
        </View>
      )}
      {dialog}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: spacing.sm,
  },
  card: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  name: {
    fontFamily: fonts.title.bold,
    fontSize: fs(20),
    lineHeight: fs(26),
    color: colors.heading,
  },
  rows: {
    gap: spacing.xxs,
  },
  noRead: {
    gap: spacing.xs,
  },
  link: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(13.5),
    lineHeight: fs(18),
    color: colors.primary,
  },
  actions: {
    gap: spacing.sm,
  },
});

export default ListVehicleStart;
