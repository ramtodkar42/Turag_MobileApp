import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, ButtonRow, Card, InfoNote } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatINR } from '../../../../utils/format';
import { timeAgo } from '../../../../utils/date';
import { useT } from '../../../../i18n';
import { OFFER_STATUS, ORDER_STATUS } from '../../../account/statuses';
import { expiresLabel, vehicleName } from '../../offerTime';

// One of the buyer's offers (as on the web's My offers):
// vehicle, status, the amount on the table (the seller's counter after one),
// time left, and what the buyer can do now:
//   COUNTERED: Accept counter / Counter back / Cancel offer
//   PENDING:   Cancel offer
//   ACCEPTED:  the order - "Pay the token" step while new, then its status.
// busy: an action on this card is running (its buttons wait).
function OfferCard({ offer, busy, onAccept, onCounter, onWithdraw, onCancelOrder }) {
  const t = useT();
  const status = OFFER_STATUS[offer.status] ?? OFFER_STATUS.PENDING;
  const countered = offer.amountBy === 'SELLER';
  const order = offer.order;

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <AppText variant="title" style={styles.name} numberOfLines={2}>
          {vehicleName(offer.vehicle, t('offers.offer'))}
        </AppText>
        <Badge label={t(status.labelKey)} tone={status.tone} />
      </View>

      <View style={styles.amounts}>
        <View style={styles.amountBlock}>
          <AppText variant="caption">
            {t(countered ? 'offers.sellerCounter' : 'offers.yourOffer')}
          </AppText>
          <AppText variant="h3" color={countered ? colors.warning : colors.heading} style={styles.amount}>
            {formatINR(offer.amount)}
          </AppText>
        </View>
        {countered && offer.lastBuyerAmount != null ? (
          <View style={styles.amountBlock}>
            <AppText variant="caption">{t('offers.yourOffer')}</AppText>
            <AppText variant="title" style={styles.amountSmall}>
              {formatINR(offer.lastBuyerAmount)}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText variant="caption" style={styles.meta}>
        {[
          offer.updatedAt ? timeAgo(offer.updatedAt) : null,
          offer.open && offer.expiresAt ? expiresLabel(offer.expiresAt) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </AppText>
      {offer.declineReason ? (
        <AppText variant="caption" color={colors.body} style={styles.meta}>
          {t('offers.declineReason', { reason: offer.declineReason })}
        </AppText>
      ) : null}

      {offer.status === 'COUNTERED' ? (
        <View style={styles.actions}>
          <ButtonRow>
            <Button title={t('offers.acceptCounter')} size="md" onPress={onAccept} disabled={busy} style={styles.flex} />
            <Button
              title={t('offers.counterBack')}
              size="md"
              variant="outline"
              onPress={onCounter}
              disabled={busy}
              style={styles.flex}
            />
          </ButtonRow>
          <Button title={t('offers.withdraw')} size="sm" variant="ghost" onPress={onWithdraw} disabled={busy} />
        </View>
      ) : null}
      {offer.status === 'PENDING' ? (
        <Button
          title={t('offers.withdraw')}
          size="sm"
          variant="outline"
          onPress={onWithdraw}
          disabled={busy}
          style={styles.single}
        />
      ) : null}

      {offer.status === 'ACCEPTED' ? (
        <View style={styles.order}>
          {order?.status === 'CREATED' ? (
            <>
              <AppText variant="title" style={styles.orderTitle}>
                {t('offers.token.title')}
              </AppText>
              <AppText variant="subtitle" style={styles.orderLine}>
                {t('offers.token.accepted', { amount: formatINR(order.agreedPrice) })}
              </AppText>
              <InfoNote style={styles.orderNote}>{t('offers.token.note')}</InfoNote>
              <Button
                title={t('offers.cancelOrder')}
                size="sm"
                variant="outline"
                onPress={onCancelOrder}
                disabled={busy}
                style={styles.single}
              />
            </>
          ) : (
            <View style={styles.orderRow}>
              {order ? (
                <Badge
                  label={t((ORDER_STATUS[order.status] ?? ORDER_STATUS.CREATED).labelKey)}
                  tone={(ORDER_STATUS[order.status] ?? ORDER_STATUS.CREATED).tone}
                />
              ) : null}
              <AppText variant="subtitle">
                {t('offers.agreedAt', { amount: formatINR(order?.agreedPrice ?? offer.amount) })}
              </AppText>
            </View>
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  amounts: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  amountBlock: {
    gap: spacing.xxs,
  },
  amount: {
    fontSize: fs(20),
    lineHeight: fs(26),
  },
  amountSmall: {
    fontSize: fs(15),
    lineHeight: fs(26),
    color: colors.body,
  },
  meta: {
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  single: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  order: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  orderTitle: {
    fontSize: fs(14),
    lineHeight: fs(19),
  },
  orderLine: {
    marginTop: spacing.xxs,
  },
  orderNote: {
    marginTop: spacing.sm,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

export default memo(OfferCard);
