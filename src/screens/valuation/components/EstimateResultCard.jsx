import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { useT } from '../../../i18n';
import TierPreview, { TierNote } from './TierPreview';
import PriceRange, { priceRange } from './PriceRange';
import PriceFactors, { knownFactors } from './PriceFactors';

// The estimate in the Evaluate chat, as one short card that fits on screen with its
// message: the vehicle, ONE price range with the most likely price (owner rule, 5 Nov
// 2026, as the web: no dealer label, no second figure, no confidence) and the tier
// today. The longer notes and "How we worked this out" open under "More details".
// valuation may be null ("Not available yet").
// label: the small heading over the price (default "Estimated value").
// summary: a short note shown in place of `description`, which then moves to the details.
// children: anything to ask with it (the value question), at the bottom of the card.
function EstimateResultCard({ vehicle, valuation, label, description, summary, showTier = false, children }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const hasValue = valuation?.estimatedValue != null;
  const range = hasValue ? priceRange(valuation) : null;
  const factors = hasValue ? knownFactors(valuation.adjustments) : [];
  const fullNote = summary ? description : null;
  const hasDetails = !!fullNote || factors.length > 0 || showTier;

  return (
    <Card style={styles.card}>
      <AppText variant="title">{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}</AppText>
      {range ? (
        <PriceRange range={range} value={valuation.estimatedValue} label={label} />
      ) : (
        <View style={styles.figure}>
          <AppText variant="label" color={colors.heading} style={styles.flex}>
            {label ?? t('common.estimatedValue')}
          </AppText>
          <AppText variant="title" color={colors.success} numberOfLines={1} style={styles.value}>
            {hasValue ? formatINR(valuation.estimatedValue) : t('valuation.result.noValue')}
          </AppText>
        </View>
      )}
      {summary || description ? (
        <AppText variant="caption" color={colors.body}>
          {summary ?? description}
        </AppText>
      ) : null}
      {showTier ? <TierPreview /> : null}
      {hasDetails ? (
        <Button
          title={t(expanded ? 'valuation.chat.lessDetails' : 'valuation.chat.moreDetails')}
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => setExpanded(open => !open)}
          style={styles.more}
        />
      ) : null}
      {expanded ? (
        <View style={styles.details}>
          {fullNote ? (
            <AppText variant="caption" color={colors.body}>
              {fullNote}
            </AppText>
          ) : null}
          <PriceFactors factors={factors} />
          {showTier ? <TierNote value={valuation?.estimatedValue} /> : null}
        </View>
      ) : null}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  figure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  value: {
    fontSize: fs(20),
    lineHeight: fs(26),
  },
  more: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },
  details: {
    gap: spacing.sm,
  },
});

export default EstimateResultCard;
