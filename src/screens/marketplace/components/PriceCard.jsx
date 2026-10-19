import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card, IconTile } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatINR, formatPriceRange } from '../../../utils/format';
import { useT } from '../../../i18n';
import { keyLabel } from '../../../i18n/vehicleLabels';

// "Price & valuation": the asking price (red), and Turag's fair-price check -
// the estimate range with how the asking price compares (Fairly priced, ...).
// vehicle: { price, reserved, fairPrice: { low, high, label, labelKey, tone } | null }
function PriceCard({ vehicle, style }) {
  const t = useT();
  const { fairPrice } = vehicle;

  return (
    <Card style={style}>
      <View style={styles.head}>
        <IconTile name="rupee" size={ms(36)} />
        <AppText variant="title" style={styles.title}>
          {t('marketplace.price.title')}
        </AppText>
        {vehicle.reserved ? <Badge label={t('marketplace.reserved')} tone="warning" size="sm" /> : null}
      </View>

      <View style={styles.row}>
        <AppText variant="subtitle" style={styles.label}>
          {t('marketplace.price.asking')}
        </AppText>
        <AppText variant="h3" color={colors.primary} style={styles.price}>
          {vehicle.price ? formatINR(vehicle.price) : '—'}
        </AppText>
      </View>

      {fairPrice ? (
        <View style={[styles.row, styles.divider]}>
          <View style={styles.flex}>
            <AppText variant="subtitle" style={styles.label}>
              {t('marketplace.price.fair')}
            </AppText>
            <AppText variant="title" color={colors.heading} style={styles.range}>
              {formatPriceRange({ min: fairPrice.low, max: fairPrice.high })}
            </AppText>
          </View>
          <Badge
            label={keyLabel(t, fairPrice.labelKey, fairPrice.label, 'marketplace.fairPrice')}
            tone={fairPrice.tone}
            size="sm"
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  divider: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  label: {
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  price: {
    fontSize: fs(20),
    lineHeight: fs(26),
  },
  range: {
    marginTop: spacing.xxs,
    fontSize: fs(14),
    lineHeight: fs(19),
  },
});

export default PriceCard;
