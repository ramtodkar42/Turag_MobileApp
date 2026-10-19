import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatINR } from '../../../../utils/format';
import { timeAgo } from '../../../../utils/date';
import { useT } from '../../../../i18n';
import { BAND_POSITION, OFFER_STATUS, ORDER_STATUS } from '../../../account/statuses';
import { expiresLabel } from '../../../offers/offerTime';

// One offer on the seller's listing (as the web): amount, buyer (phone-
// verified or not) and when, where it sits against the fair-price bands, then
//   PENDING:   Accept / Counter / Decline
//   COUNTERED: "Awaiting buyer" (your counter)
//   ACCEPTED:  the order's status
//   otherwise: the offer's status.
function ReceivedOfferRow({ offer, busy, first, onAccept, onCounter, onDecline }) {
  const t = useT();
  const band = BAND_POSITION[offer.bandPosition];
  const yourCounter = offer.amountBy === 'SELLER';

  let state = null;
  if (offer.status === 'COUNTERED') {
    state = <Badge label={t('selling.awaitingBuyer')} tone="warning" size="sm" />;
  } else if (offer.status === 'ACCEPTED') {
    const order = ORDER_STATUS[offer.order?.status] ?? ORDER_STATUS.CREATED;
    state = <Badge label={t(order.sellerLabelKey ?? order.labelKey)} tone={order.tone} size="sm" />;
  } else if (offer.status !== 'PENDING') {
    const status = OFFER_STATUS[offer.status] ?? OFFER_STATUS.PENDING;
    state = <Badge label={t(status.labelKey)} tone={status.tone} size="sm" />;
  }

  return (
    <View style={[styles.row, !first && styles.divider]}>
      <View style={styles.top}>
        <View style={styles.amountBlock}>
          <AppText variant="caption">{t(yourCounter ? 'selling.yourCounter' : 'selling.buyerOffer')}</AppText>
          <AppText variant="h3" style={styles.amount}>
            {formatINR(offer.amount)}
          </AppText>
        </View>
        {state}
      </View>

      <AppText variant="caption" style={styles.meta}>
        {[
          t(offer.phoneVerified ? 'selling.verifiedBuyer' : 'selling.buyer'),
          offer.updatedAt ? timeAgo(offer.updatedAt) : null,
          offer.open && offer.expiresAt ? expiresLabel(offer.expiresAt) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </AppText>
      {band ? (
        <AppText variant="caption" color={colors[band.color]} style={styles.meta}>
          {t(band.labelKey)}
        </AppText>
      ) : null}

      {offer.status === 'PENDING' ? (
        <View style={styles.actions}>
          <Button title={t('selling.accept')} size="sm" onPress={onAccept} disabled={busy} style={styles.action} />
          <Button
            title={t('selling.counter')}
            size="sm"
            variant="outline"
            onPress={onCounter}
            disabled={busy}
            style={styles.action}
          />
          <Button title={t('selling.decline')} size="sm" variant="ghost" onPress={onDecline} disabled={busy} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  amountBlock: {
    flex: 1,
  },
  amount: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  meta: {
    marginTop: spacing.xxs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: {
    minWidth: '28%',
  },
});

export default memo(ReceivedOfferRow);
