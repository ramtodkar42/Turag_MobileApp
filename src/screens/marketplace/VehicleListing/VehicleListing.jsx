import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  FadeIn,
  Header,
  Icon,
  ScreenContainer,
  StatusView,
  TierBadge,
  ChallanCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';
import { requireLogin } from '../../../store/loginPromptStore';
import { useT } from '../../../i18n';
import { codeLabel, keyLabel } from '../../../i18n/vehicleLabels';
import DescriptionCard from '../components/DescriptionCard';
import InspectionBanner from '../components/InspectionBanner';
import InspectionSummaryCard from '../components/InspectionSummaryCard';
import ReportDetailCard from '../components/ReportDetailCard';
import PriceCard from '../components/PriceCard';
import SpecGrid from '../components/SpecGrid';
import VehicleGallery from '../components/VehicleGallery';
import useVehicleDetails from '../useVehicleDetails';

// Vehicle page opened from a marketplace card (GET /marketplace/listings/{id}):
// photos edge to edge (back / bookmark on them), name and year · fuel · city,
// detail tiles, the inspection status, price & valuation, the inspection
// report, About This Car, then "Make an offer". Shows the card's data at
// once and fills in the rest.
function VehicleListing({ navigation, route }) {
  const t = useT();
  const { vehicle, loading, error, notFound, retry } = useVehicleDetails(
    route.params.vehicle,
  );

  if (notFound) {
    return (
      <ScreenContainer header={<Header onBack={navigation.goBack} />}>
        <StatusView
          title={t('marketplace.notFound.title')}
          message={t('marketplace.notFound.message')}
        >
          <Button
            title={t('marketplace.notFound.back')}
            size="md"
            onPress={navigation.goBack}
            style={styles.action}
          />
        </StatusView>
      </ScreenContainer>
    );
  }

  const fuel = codeLabel(t, 'marketplace.fuel', vehicle.fuelCode, vehicle.fuel);
  const meta = [vehicle.year, fuel].filter(Boolean).join(' • ');
  // "Baner, Pune, Maharashtra" (as the web's vehicle page).
  const where = [vehicle.place ?? vehicle.city, vehicle.state]
    .filter(Boolean)
    .join(', ');

  // The first four are the tiles always shown.
  const rows = [
    {
      label: t('marketplace.details.vehicleType'),
      value: keyLabel(
        t,
        vehicle.vehicleTypeKey,
        vehicle.vehicleType,
        'marketplace.vehicleType',
      ),
    },
    { label: t('marketplace.details.fuel'), value: fuel },
    { label: t('marketplace.details.year'), value: vehicle.year },
    {
      label: t('marketplace.details.transmission'),
      value: codeLabel(
        t,
        'marketplace.transmission',
        vehicle.transmissionCode,
        vehicle.transmission,
      ),
    },
    {
      label: t('marketplace.details.bodyType'),
      value: codeLabel(
        t,
        'marketplace.bodyType',
        vehicle.bodyTypeCode,
        vehicle.bodyType,
      ),
    },
    {
      label: t('marketplace.details.colour'),
      value: codeLabel(
        t,
        'marketplace.colour',
        vehicle.colorCode,
        vehicle.color,
      ),
    },
    { label: t('marketplace.details.seats'), value: vehicle.seats },
    {
      label: t('marketplace.details.engine'),
      value: vehicle.engineCc
        ? t('marketplace.details.engineValue', { cc: vehicle.engineCc })
        : null,
    },
    {
      label: t('marketplace.details.mileage'),
      value: vehicle.mileageKmpl
        ? t('marketplace.details.mileageValue', { kmpl: vehicle.mileageKmpl })
        : null,
    },
  ].filter(row => row.value != null && row.value !== '');

  const inspection = keyLabel(
    t,
    vehicle.inspectionKey,
    vehicle.inspection,
    'marketplace.inspection',
  );
  const offerBlocked = vehicle.reserved || vehicle.eligible === false;
  const offerTitle = vehicle.reserved
    ? t('marketplace.reserved')
    : t('marketplace.offer.make');

  return (
    <ScreenContainer
      scroll
      padded={false}
      safeTop={false}
      footer={
        <>
          {vehicle.eligible === false && vehicle.ineligibleReason ? (
            <AppText variant="caption" align="center" color={colors.danger}>
              {vehicle.ineligibleReason}
            </AppText>
          ) : null}
          <Button
            title={offerTitle}
            disabled={offerBlocked || loading}
            onPress={() =>
              requireLogin('offer') &&
              navigation.navigate(ROUTES.MAKE_OFFER, { vehicle })
            }
          />
        </>
      }
    >
      <VehicleGallery
        vehicle={vehicle}
        onBack={navigation.goBack}
        loading={loading}
      />

      <View style={styles.body}>
        <AppText variant="h2" style={styles.name}>
          {vehicle.name}
        </AppText>
        {meta ? <AppText variant="caption">{meta}</AppText> : null}
        {vehicle.variant ? (
          <AppText variant="caption" color={colors.placeholder}>
            {vehicle.variant}
          </AppText>
        ) : null}
        {where ? (
          <View style={styles.where}>
            <Icon name="mapPin" size={ms(13)} color={colors.body} />
            <AppText variant="caption" style={styles.flex}>
              {where}
            </AppText>
          </View>
        ) : null}

        {/* Turag tier and what it means (as the web). */}
        {vehicle.tier ? (
          <View style={styles.tier}>
            <TierBadge tier={vehicle.tier} size="md" />
            <AppText variant="caption" style={styles.tierNote}>
              {t(`marketplace.tier.note.${vehicle.tier}`)}
            </AppText>
          </View>
        ) : null}

        <SpecGrid rows={rows} style={styles.section} />

        {inspection ? (
          <InspectionBanner
            label={inspection}
            verified={vehicle.verified}
            style={styles.section}
          />
        ) : null}

        <PriceCard vehicle={vehicle} style={styles.section} />

        {vehicle.report ? (
          <FadeIn>
            <InspectionSummaryCard
              report={vehicle.report}
              style={styles.section}
            />
            <ReportDetailCard report={vehicle.report} style={styles.section} />
          </FadeIn>
        ) : null}

        {/* Traffic challans (summary): only when a check has run (as the web). */}
        {vehicle.challans ? (
          <FadeIn>
            <ChallanCard
              challans={vehicle.challans}
              compact
              style={styles.section}
            />
          </FadeIn>
        ) : null}

        <DescriptionCard
          title={t('marketplace.details.about')}
          text={vehicle.description}
          style={styles.section}
        />

        {error ? (
          <StatusView message={error} style={styles.section}>
            <Button
              title={t('common.retry')}
              size="sm"
              variant="outline"
              onPress={retry}
              style={styles.action}
            />
          </StatusView>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  name: {
    fontSize: fs(22),
    lineHeight: fs(28),
  },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  flex: {
    flex: 1,
  },
  tier: {
    marginTop: spacing.md,
  },
  tierNote: {
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
  },
  action: {
    marginTop: spacing.md,
  },
});

export default VehicleListing;
