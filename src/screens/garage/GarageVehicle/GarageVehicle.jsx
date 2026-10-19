import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  ButtonRow,
  Header,
  Icon,
  InfoNote,
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
import { removeFromGarageById } from '../../../store/garageStore';
import useConfirmDialog from '../../../hooks/useConfirmDialog';

// One of the user's own vehicles (from the Garage): details, pre-estimated
// value, and the next steps - as on the web's Garage card (ADR-0038):
//   not inspection-eligible -> self-inspect now / book an inspector
//   eligible + listed       -> view listing
//   eligible + valued       -> list this vehicle
// plus "View report" (once there's an inspection) and "Remove from garage".
function GarageVehicle({ navigation, route }) {
  const t = useT();
  const { vehicle } = route.params;
  const name = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;

  // A vehicle can only be listed once a report-ready inspection makes it
  // eligible; until then we offer the two ways to get it inspected.
  const needsInspection = !vehicle.inspectionEligible && !vehicle.listingId;
  const canSelfInspect = supportsSelfInspection(vehicle); // M1 is cars-only
  const valuationParam = vehicle.valuationId
    ? { valuationId: vehicle.valuationId, estimatedValue: vehicle.estimatedValue }
    : null;

  const [starting, setStarting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
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
      <AppText variant="title" style={styles.detailsTitle}>
        {t('garage.vehicle.details')}
      </AppText>
    </View>
  );

  // The primary next step, gated on inspection eligibility (as the web).
  let primary;
  if (needsInspection) {
    primary = canSelfInspect ? (
      <ButtonRow>
        <Button
          title={t(starting ? 'garage.vehicle.selfInspecting' : 'garage.vehicle.selfInspect')}
          style={styles.flex}
          loading={starting}
          disabled={starting || removing}
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
    ) : (
      <Button
        title={t('garage.vehicle.bookInspector')}
        disabled={removing}
        onPress={bookInspector}
      />
    );
  } else if (vehicle.listingId) {
    primary = (
      <Button
        title={t('garage.card.viewListing')}
        disabled={removing}
        onPress={() => navigation.navigate(ROUTES.MY_LISTING, { listingId: vehicle.listingId })}
      />
    );
  } else if (vehicle.valuationId) {
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
        {/* Only once a self / inspector inspection is done (report-ready) — a
            report exists only when the vehicle is inspection-eligible. */}
        {vehicle.inspectionId && vehicle.inspectionEligible ? (
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
  flex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
});

export default GarageVehicle;
