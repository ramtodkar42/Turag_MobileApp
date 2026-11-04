import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { useT } from '../../../i18n';
import TierPreview, { TierNote } from './TierPreview';
import { sellerFigures } from './EstimateSummary';

function Figure({ label, value, range }) {
  return (
    <View style={styles.figure}>
      <View style={styles.figureTop}>
        <AppText variant="label" color={colors.heading} style={styles.flex}>
          {label}
        </AppText>
        <AppText variant="title" color={colors.success} numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      </View>
      {range ? (
        <AppText variant="caption" color={colors.muted}>
          {range}
        </AppText>
      ) : null}
    </View>
  );
}

// The estimate in the Evaluate chat, as one short card that fits on screen with its
// message: the vehicle, what a dealer and a private buyer pay, and the tier today. The
// longer notes open under "More details". valuation may be null ("Not available yet").
// summary: a short note shown in place of `description`, which then moves to the details.
// children: anything to ask with it (the value question), at the bottom of the card.
function EstimateResultCard({ vehicle, valuation, label, description, summary, showTier = false, children }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const hasValue = valuation?.estimatedValue != null;
  const { dealer, privateSale } = hasValue ? sellerFigures(valuation) : {};
  const range = band => t('valuation.estimate.range', { low: formatINR(band.low), high: formatINR(band.high) });
  const fullNote = summary ? description : null;
  const hasDetails = !!fullNote || !!privateSale || showTier;

  return (
    <Card style={styles.card}>
      <AppText variant="title">{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}</AppText>
      <View style={styles.figures}>
        <Figure
          label={label ?? t(dealer || privateSale ? 'valuation.estimate.dealerPays' : 'common.preEstimatedValue')}
          value={hasValue ? formatINR(valuation.estimatedValue) : t('valuation.result.noValue')}
          range={dealer ? range(dealer) : null}
        />
        {privateSale ? (
          <Figure label={t('valuation.estimate.privateSale')} value={formatINR(privateSale.value)} range={range(privateSale)} />
        ) : null}
      </View>
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
          {privateSale ? (
            <AppText variant="caption" color={colors.body}>
              {t('valuation.estimate.privateHelp')}
            </AppText>
          ) : null}
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
  figures: {
    gap: spacing.sm,
  },
  figure: {
    gap: spacing.xxs,
  },
  figureTop: {
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
