import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Badge,
  Button,
  ButtonRow,
  Header,
  Icon,
  InfoNote,
  InspectionConsent,
  KeyValueCard,
  ScreenContainer,
  ValueCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatDate, formatINR } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { codeLabel, keyLabel } from '../../../i18n/vehicleLabels';
import { supportsSelfInspection } from '../../../api/mappers/valuation';
import { startSelfInspection } from '../../../api/services/valuation.api';
import { loadGarage, removeFromGarageById, useGarage } from '../../../store/garageStore';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { phaseAction, phaseBadge, phaseHintKey } from '../garagePhase';

// One of the user's own vehicles (from the Garage): details, pre-estimated
// value, where it is (the web's Garage card stages, see garagePhase) and the
// next step:
//   not inspected      -> self-inspect now / book an inspector
//   self-inspection on -> continue it (never a second one)
//   with Turag         -> wait (a submitted self-inspection: view its summary;
//                         rejected: book an inspector)
//   inspected          -> list it / view its listing
// plus "View report" (once the inspection is finished) and "Remove from garage".
// It shows the Garage's latest copy of the vehicle, refreshed when the page
// comes back into view (e.g. after the self-inspection).
function GarageVehicle({ navigation, route }) {
  const t = useT();
  const garage = useGarage();
  const vehicle = garage.find(v => v.id === route.params.vehicle.id) ?? route.params.vehicle;
  const name = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
  useFocusEffect(
    useCallback(() => {
      loadGarage();
    }, []),
  );

  const action = phaseAction(vehicle);
  const badge = phaseBadge(vehicle);
  const hintKey = phaseHintKey(vehicle);
  const needsInspection = action === 'inspect';
  const canSelfInspect = supportsSelfInspection(vehicle); // M1 is cars-only
  const valuationParam = vehicle.valuationId
    ? { valuationId: vehicle.valuationId, estimatedValue: vehicle.estimatedValue }
    : null;

  const [starting, setStarting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  // Inspection consent for a self-inspection (ticked to start one).
  const [consent, setConsent] = useState(false);
  const openPolicy = () =>
    navigation.navigate(ROUTES.WEB_PAGE, { title: t('profile.item.privacyPolicy'), path: '/privacy_policy' });
  const { confirm, dialog } = useConfirmDialog();

  const bookInspector = () =>
    navigation.navigate(ROUTES.BOOK_APPOINTMENT, { vehicle, valuation: valuationParam });

  // Self-inspection (M1) is cars-only; otherwise fall back to booking.
  const selfInspect = async () => {
    if (!canSelfInspect) {
      bookInspector();
      return;
    }
    setStarting(true);
    setError('');
    try {
      const { inspectionId } = await startSelfInspection({
        vehicleId: vehicle.vehicleId,
        category: vehicle.category,
        consent,
      });
      navigation.navigate(ROUTES.SELF_INSPECTION, {
        inspectionId,
        vehicle,
        valuation: valuationParam,
      });
    } catch (e) {
      setError(e.message || t('garage.vehicle.selfInspectError'));
    } finally {
      setStarting(false);
    }
  };

  // The self-inspection already started (continue it) / submitted (its summary).
  const openSelfInspection = () =>
    navigation.navigate(ROUTES.SELF_INSPECTION, {
      inspectionId: vehicle.inspectionId,
      vehicle,
      valuation: valuationParam,
    });

  const viewReport = () =>
    navigation.navigate(ROUTES.INSPECTION_REPORT, { inspectionId: vehicle.inspectionId });

  const remove = () =>
    confirm({
      title: t('garage.vehicle.removeTitle'),
      message: t('garage.vehicle.removeMessage'),
      confirmLabel: t('garage.vehicle.removeConfirm'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        setRemoving(true);
        setError('');
        try {
          await removeFromGarageById(vehicle.id);
          navigation.goBack();
        } catch (e) {
          setError(e.message || t('garage.vehicle.removeError'));
          setRemoving(false);
        }
      },
    });

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <AppText variant="h3" style={styles.name}>
          {name}
        </AppText>
        <Icon name="bookmark" size={ms(20)} color={colors.heading} filled />
      </View>
      <AppText variant="caption">{t('garage.vehicle.match')}</AppText>
      <View style={styles.stage}>
        <Badge label={t(badge.labelKey)} tone={badge.tone} size="sm" style={styles.badge} />
        {hintKey ? <AppText variant="caption">{t(hintKey)}</AppText> : null}
      </View>
      <AppText variant="title" style={styles.detailsTitle}>
        {t('garage.vehicle.details')}
      </AppText>
    </View>
  );

  // The primary next step for the vehicle's stage (as the web's Garage card).
  let primary = null;
  if (action === 'resume' || action === 'summary') {
    primary = (
      <Button
        title={t(action === 'resume' ? 'garage.card.continue' : 'garage.card.viewSummary')}
        variant={action === 'resume' ? 'primary' : 'outline'}
        disabled={removing}
        onPress={openSelfInspection}
      />
    );
  } else if (action === null) {
    primary = null; // with Turag: nothing to do but wait (the chip says so)
  } else if (needsInspection) {
    primary = canSelfInspect ? (
      <View>
        {/* As the web: the self-inspection starts only once the consent is ticked. */}
        <InspectionConsent
          checked={consent}
          onToggle={() => setConsent(c => !c)}
          onOpenPolicy={openPolicy}
          style={styles.consent}
        />
        <ButtonRow>
          <Button
            title={t(starting ? 'garage.vehicle.selfInspecting' : 'garage.vehicle.selfInspect')}
            style={styles.flex}
            loading={starting}
            disabled={!consent || starting || removing}
            onPress={selfInspect}
          />
          <Button
            title={t('garage.vehicle.bookInspector')}
            variant="outline"
            style={styles.flex}
            disabled={starting || removing}
            onPress={bookInspector}
          />
        </ButtonRow>
      </View>
    ) : (
      <Button
        title={t('garage.vehicle.bookInspector')}
        disabled={removing}
        onPress={bookInspector}
      />
    );
  } else if (action === 'view') {
    primary = (
      <Button
        title={t('garage.card.viewListing')}
        disabled={removing}
        onPress={() => navigation.navigate(ROUTES.MY_LISTING, { listingId: vehicle.listingId })}
      />
    );
  } else if (action === 'list') {
    primary = (
      <Button
        title={t('garage.vehicle.createListing')}
        disabled={removing}
        onPress={() => navigation.navigate(ROUTES.CREATE_LISTING, { vehicle })}
      />
    );
  } else {
    primary = (
      <Button
        title={t('garage.vehicle.bookInspector')}
        disabled={removing}
        onPress={bookInspector}
      />
    );
  }

  const footer = (
    <View style={styles.footer}>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
      {primary}
      <View style={styles.secondary}>
        {/* Only once the latest inspection is finished (as the web: the
            report is put together from a finished inspection). */}
        {vehicle.inspectionId && vehicle.reportReady ? (
          <Button
            title={t('garage.vehicle.viewReport')}
            size="sm"
            variant="outline"
            style={styles.flex}
            disabled={removing}
            onPress={viewReport}
          />
        ) : null}
        <Button
          title={t(removing ? 'garage.vehicle.removing' : 'garage.vehicle.remove')}
          size="sm"
          variant="outline"
          style={styles.flex}
          loading={removing}
          disabled={starting || removing}
          onPress={remove}
        />
      </View>
    </View>
  );

  return (
    <ScreenContainer scroll header={<Header onBack={navigation.goBack} />} footer={footer}>
      <KeyValueCard
        dense
        header={header}
        rows={[
          {
            label: t('garage.vehicle.category'),
            value: keyLabel(t, vehicle.categoryKey, vehicle.category, 'marketplace.vehicleType'),
          },
          {
            label: t('garage.vehicle.fuel'),
            value: codeLabel(t, 'marketplace.fuel', vehicle.fuelCode, vehicle.fuel),
          },
          { label: t('garage.vehicle.year'), value: vehicle.year },
          { label: t('garage.vehicle.previousOwner'), value: vehicle.ownerCount },
          {
            label: t('garage.vehicle.savedOn'),
            value: vehicle.savedOn ? formatDate(vehicle.savedOn) : null,
          },
        ].filter(row => row.value != null && row.value !== '')}
        style={styles.card}
      />

      <ValueCard
        value={
          vehicle.estimatedValue != null
            ? `${formatINR(vehicle.estimatedValue)}/-`
            : t('garage.card.noValue')
        }
        title={name}
        description={t('garage.vehicle.valueNote')}
        style={styles.card}
      />

      <InfoNote style={styles.note}>
        {t(needsInspection ? 'garage.vehicle.needsInspectNote' : 'garage.vehicle.inspectNote')}
      </InfoNote>

      {dialog}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  header: {
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  stage: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
  },
  detailsTitle: {
    marginTop: spacing.md,
    fontSize: fs(14),
    lineHeight: fs(19),
  },
  note: {
    marginTop: spacing.md,
  },
  footer: {
    gap: spacing.sm,
  },
  error: {
    textAlign: 'center',
  },
  secondary: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Buttons share a row, so less side padding keeps labels on one line.
  consent: {
    marginBottom: spacing.md,
  },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
});

export default GarageVehicle;
