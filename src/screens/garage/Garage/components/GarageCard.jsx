import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Badge,
  Button,
  CheckCircle,
  VehicleImage,
} from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { formatINR } from '../../../../utils/format';
import { useT } from '../../../../i18n';

// status (from the vehicle's latest inspection on the backend) -> badge.
const STATUS = {
  not_inspected: { labelKey: 'garage.status.not_inspected', tone: 'neutralOnPhoto' },
  in_review: { labelKey: 'garage.status.in_review', tone: 'warningOnPhoto' },
  verified: { labelKey: 'common.verified', tone: 'successOnPhoto' },
};

// The card's action, as on the web's Garage (ADR-0038: a vehicle can only be
// listed once it has a report-ready inspection):
//   listed (in review / live)     -> "View listing"
//   not inspection-eligible yet   -> "Inspect to list" (opens the detail page,
//                                     where self-inspect / book an inspector live)
//   eligible + has an estimate    -> "List this vehicle"
//   eligible, no estimate yet     -> "Book an inspection"
const actionOf = vehicle => {
  if (vehicle.listingId) {
    return {
      kind: 'view',
      questionKey: vehicle.listingStatus === 'LIVE' ? 'garage.card.live' : 'garage.card.inReview',
      titleKey: 'garage.card.viewListing',
    };
  }
  if (!vehicle.inspectionEligible) {
    return { kind: 'open', questionKey: 'garage.card.needsInspection', titleKey: 'garage.card.inspectToList' };
  }
  if (vehicle.valuationId) {
    return { kind: 'list', questionKey: 'garage.card.question', titleKey: 'garage.card.list' };
  }
  return { kind: 'book', questionKey: 'garage.card.needsValue', titleKey: 'garage.card.book' };
};

// Garage grid card: photo with status badge, name, pre-estimated value, and
// one action (see actionOf). onAction(kind, vehicle).
function GarageCard({ vehicle, width, onPress, onAction }) {
  const t = useT();
  const status = STATUS[vehicle.status] ?? STATUS.not_inspected;
  const statusLabel = t(status.labelKey);
  const verified = vehicle.status === 'verified';
  const action = actionOf(vehicle);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${vehicle.make} ${vehicle.model}, ${statusLabel}`}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <View style={styles.imageWrap}>
        <VehicleImage source={vehicle.image} style={styles.image} />
        <Badge
          label={statusLabel}
          tone={status.tone}
          size="sm"
          icon={verified ? <CheckCircle size={ms(11)} /> : null}
          style={styles.badge}
        />
        {verified ? (
          <View style={styles.tick}>
            <CheckCircle size={ms(18)} />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <AppText variant="title" numberOfLines={1} style={styles.name}>
          {vehicle.make} {vehicle.model}
        </AppText>

        <AppText variant="caption" style={styles.valueLabel}>
          {t('common.preEstimatedValue')}
        </AppText>
        <AppText variant="title" color={colors.success} numberOfLines={1} style={styles.value}>
          {vehicle.estimatedValue != null
            ? `${formatINR(vehicle.estimatedValue)}/-`
            : t('garage.card.noValue')}
        </AppText>

        <View style={styles.divider} />

        <AppText variant="caption" numberOfLines={1} style={styles.question}>
          {t(action.questionKey)}
        </AppText>
        <Button
          title={t(action.titleKey)}
          size="sm"
          variant={action.kind === 'view' ? 'outline' : 'primary'}
          onPress={() => onAction(action.kind, vehicle)}
          style={styles.button}
        />
      </View>
    </Pressable>
  );
}

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
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 1.4,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  tick: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  body: {
    padding: spacing.sm,
  },
  name: {
    fontSize: fs(14),
    lineHeight: fs(19),
  },
  valueLabel: {
    marginTop: spacing.sm,
    fontSize: fs(11),
  },
  value: {
    marginTop: spacing.xxs,
    fontSize: fs(17),
    lineHeight: fs(22),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
    backgroundColor: colors.border,
  },
  question: {
    fontSize: fs(11),
  },
  button: {
    alignSelf: 'stretch',
    height: ms(34),
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});

export default memo(GarageCard);
