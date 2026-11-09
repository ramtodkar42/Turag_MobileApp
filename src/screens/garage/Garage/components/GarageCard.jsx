import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, CheckCircle, IconTile, VehicleImage } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { formatINR, vehicleName } from '../../../../utils/format';
import { codeLabel } from '../../../../i18n/vehicleLabels';
import { useT } from '../../../../i18n';
import { phaseAction, phaseBadge, phaseHintKey } from '../../garagePhase';

// A thin strip along the top in the stage's colour, so where a vehicle stands
// reads at a glance (as the web's Garage card).
const ACCENT = { success: colors.success, warning: colors.warning, neutral: colors.border };

// The card's one action per stage (as the web's Garage card, see garagePhase).
// lineKey: what's said above the button when the stage has no help line of its own.
const CARD_ACTION = {
  view: { lineKey: null, titleKey: 'garage.card.viewListing' },
  list: { lineKey: 'garage.card.readyToList', titleKey: 'garage.card.list' },
  book: { lineKey: 'garage.card.needsValue', titleKey: 'garage.card.book' },
  pay: { lineKey: 'garage.hint.paymentPending', titleKey: 'garage.card.completePayment' },
  resume: { lineKey: 'garage.hint.resume', titleKey: 'garage.card.continue' },
  summary: { lineKey: 'garage.card.withTurag', titleKey: 'garage.card.viewSummary' },
  inspect: { lineKey: 'garage.hint.fresh', titleKey: 'garage.card.inspectToList' },
  wait: { lineKey: 'garage.card.withTurag', titleKey: 'garage.card.viewDetails' },
};
const SECONDARY = new Set(['view', 'summary', 'wait']);

// One saved vehicle in the Garage: which vehicle (icon, name, year and fuel), where
// it stands (the coloured strip and chip), its pre-estimated value, one line on
// what happens next, and the button for it. The whole card opens the vehicle page.
// onAction(kind, vehicle), kind from garagePhase.phaseAction ('wait' opens the page).
// style: the list's sizing (full width on phones, a column on tablets).
function GarageCard({ vehicle, style, onPress, onAction }) {
  const t = useT();
  const badge = phaseBadge(vehicle);
  const kind = phaseAction(vehicle) ?? 'wait';
  const action = CARD_ACTION[kind];
  const name = vehicleName(vehicle.make, vehicle.model) || t('garage.vehicle.details');
  const facts = [vehicle.year, codeLabel(t, 'marketplace.fuel', vehicle.fuelCode, vehicle.fuel)].filter(Boolean).join(' · ');
  const hasValue = vehicle.estimatedValue != null;
  const lineKey =
    kind === 'view'
      ? vehicle.listingStatus === 'LIVE'
        ? 'garage.card.live'
        : 'garage.card.inReview'
      : phaseHintKey(vehicle) ?? action.lineKey;
  const bike = vehicle.category === 'TWO_WHEELER';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${t(badge.labelKey)}`}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}
    >
      <View style={[styles.accent, { backgroundColor: ACCENT[badge.tone] }]} />

      <View style={styles.body}>
        <View style={styles.head}>
          {vehicle.image ? (
            <View style={styles.tile}>
              <VehicleImage source={vehicle.image} style={styles.photo} />
            </View>
          ) : (
            <IconTile name={bike ? 'bike' : 'car'} size={TILE} />
          )}
          <View style={styles.flex}>
            <AppText variant="title" numberOfLines={2} style={styles.name}>
              {name}
            </AppText>
            {facts ? (
              <AppText variant="caption" numberOfLines={1}>
                {facts}
              </AppText>
            ) : null}
          </View>
          <Badge
            label={t(badge.shortKey)}
            tone={badge.tone}
            size="sm"
            numberOfLines={1}
            icon={badge.tone === 'success' ? <CheckCircle size={ms(12)} /> : null}
            style={styles.chip}
          />
        </View>

        <View style={styles.value}>
          <AppText variant="caption" style={styles.flex}>
            {t('common.preEstimatedValue')}
          </AppText>
          {hasValue ? (
            <AppText variant="title" color={colors.success} numberOfLines={1} style={styles.amount}>
              {`${formatINR(vehicle.estimatedValue)}/-`}
            </AppText>
          ) : (
            <AppText variant="label" color={colors.placeholder} numberOfLines={1}>
              {t('garage.card.noValue')}
            </AppText>
          )}
        </View>

        {lineKey ? (
          <AppText variant="caption" color={colors.body} style={styles.line}>
            {t(lineKey)}
          </AppText>
        ) : null}

        <Button
          title={t(action.titleKey)}
          size="md"
          variant={SECONDARY.has(kind) ? 'outline' : 'primary'}
          onPress={() => onAction(kind, vehicle)}
        />
      </View>
    </Pressable>
  );
}

const TILE = ms(48);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  accent: {
    height: ms(4),
  },
  body: {
    gap: spacing.md,
    padding: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  photo: {
    width: TILE,
    height: TILE,
  },
  flex: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  chip: {
    flexShrink: 0,
    maxWidth: '40%',
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  amount: {
    fontSize: fs(17),
    lineHeight: fs(22),
  },
  line: {
    lineHeight: fs(18),
  },
});

export default memo(GarageCard);
