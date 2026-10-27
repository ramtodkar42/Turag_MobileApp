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
import { phaseAction, phaseBadge, phaseOf } from '../../garagePhase';

// The chip sits on the photo: its "on photo" look.
const ON_PHOTO = { success: 'successOnPhoto', warning: 'warningOnPhoto', neutral: 'neutralOnPhoto' };

// The card's one action per stage (as the web's Garage card, see garagePhase):
// a short line saying where it is, and the button for the next step.
const CARD_ACTION = {
  view: { questionKey: null, titleKey: 'garage.card.viewListing' },
  list: { questionKey: 'garage.card.question', titleKey: 'garage.card.list' },
  book: { questionKey: 'garage.card.needsValue', titleKey: 'garage.card.book' },
  pay: { questionKey: 'garage.card.payQuestion', titleKey: 'garage.card.completePayment' },
  resume: { questionKey: 'garage.card.resumeQuestion', titleKey: 'garage.card.continue' },
  summary: { questionKey: 'garage.card.withTurag', titleKey: 'garage.card.viewSummary' },
  inspect: { questionKey: 'garage.card.needsInspection', titleKey: 'garage.card.inspectToList' },
  wait: { questionKey: 'garage.card.withTurag', titleKey: 'garage.card.viewDetails' },
};

// Garage grid card: photo with the stage chip, name, pre-estimated value, and
// one action. onAction(kind, vehicle) with kind from garagePhase.phaseAction
// ('wait' opens the vehicle page).
function GarageCard({ vehicle, width, onPress, onAction }) {
  const t = useT();
  const badge = phaseBadge(vehicle);
  const statusLabel = t(badge.labelKey);
  const done = phaseOf(vehicle) === 'can_list' || phaseOf(vehicle) === 'listed';
  const kind = phaseAction(vehicle) ?? 'wait';
  const action = CARD_ACTION[kind];
  // A rejected inspection reads as "needs attention" above its Book button.
  const questionKey =
    kind === 'book' && vehicle.inspectionStatus === 'QC_REJECTED'
      ? 'garage.card.rejected'
      : kind === 'view'
      ? vehicle.listingStatus === 'LIVE'
        ? 'garage.card.live'
        : 'garage.card.inReview'
      : action.questionKey;

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
          tone={ON_PHOTO[badge.tone]}
          size="sm"
          icon={done ? <CheckCircle size={ms(11)} /> : null}
          style={styles.badge}
        />
        {done ? (
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
          {t(questionKey)}
        </AppText>
        <Button
          title={t(action.titleKey)}
          size="sm"
          variant={kind === 'view' || kind === 'summary' || kind === 'wait' ? 'outline' : 'primary'}
          onPress={() => onAction(kind, vehicle)}
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
    maxWidth: '80%',
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
