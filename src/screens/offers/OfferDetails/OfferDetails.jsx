import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Badge,
  Button,
  ButtonRow,
  Card,
  CardListSkeleton,
  FadeIn,
  Header,
  Icon,
  InfoNote,
  ScreenContainer,
  StatusView,
  TitledCard,
  VehicleImage,
} from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { openWebPage } from '../../../utils/linking';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { codeLabel } from '../../../i18n/vehicleLabels';
import { useT } from '../../../i18n';
import { ROUTES } from '../../../navigation/routes';
import { OFFER_STATUS, ORDER_STATUS } from '../../account/statuses';
import CounterSheet from '../components/CounterSheet';
import TransferChecklist from '../components/TransferChecklist';
import { expiresLabel, vehicleName } from '../offerTime';
import OfferTimeline from './components/OfferTimeline';
import { buildOfferTimeline } from './offerTimeline';
import useOfferDetails from './useOfferDetails';

// A line of the token breakdown: label on the left, amount on the right.
function AmountRow({ label, amount, strong }) {
  return (
    <View style={styles.amountRow}>
      <AppText variant={strong ? 'label' : 'caption'} color={strong ? colors.heading : colors.body}>
        {label}
      </AppText>
      <AppText variant={strong ? 'title' : 'caption'} color={strong ? colors.heading : colors.body}>
        {formatINR(amount)}
      </AppText>
    </View>
  );
}

// One of the buyer's offers, opened from My offers (the web's offer page): the
// vehicle, your offer / the seller's counter, its progress, and what to do now:
//   PENDING / COUNTERED: accept the counter, counter back, withdraw
//   ACCEPTED, order new: pay the token (held in escrow until handover), cancel
//     the order, or apply for a loan
//   token paid:          upload your transfer documents (KYC, insurance)
//   handed over:         the purchase documents
// params: { offerId }
function OfferDetails({ navigation, route }) {
  const t = useT();
  const { offerId } = route.params;
  const d = useOfferDetails(offerId);
  const { confirm, dialog } = useConfirmDialog();
  const [countering, setCountering] = useState(false);
  const header = <Header onBack={navigation.goBack} title={t('offers.detail.title')} />;

  if (d.loading) {
    return (
      <ScreenContainer scroll header={header}>
        <CardListSkeleton cards={[3, 4, 3]} style={styles.card} />
      </ScreenContainer>
    );
  }
  if (d.error) {
    const notFound = d.errorCode === 'OFFER_NOT_FOUND';
    return (
      <ScreenContainer header={header}>
        <StatusView title={t(notFound ? 'offers.detail.notFound' : 'offers.error.title')} message={d.error}>
          <Button
            title={t(notFound ? 'common.back' : 'common.retry')}
            size="md"
            onPress={notFound ? navigation.goBack : d.reload}
            style={styles.action}
          />
        </StatusView>
      </ScreenContainer>
    );
  }

  const { offer, listing, pay } = d;
  const order = offer.order;
  const name = vehicleName(offer.vehicle, t('offers.offer'));
  const status = OFFER_STATUS[offer.status] ?? OFFER_STATUS.PENDING;
  const countered = offer.amountBy === 'SELLER';
  const yourAmount = countered ? offer.lastBuyerAmount : offer.amount;
  const acceptedAmount = order?.agreedPrice ?? offer.amount;
  const tokenStep = offer.status === 'ACCEPTED' && order?.status === 'CREATED';
  const handedOver = order?.status === 'HANDED_OVER' || order?.status === 'COMPLETED';
  const payBusy = pay?.phase === 'paying';
  const canPay = !pay || pay.phase === 'failed' || payBusy;
  const chips = listing
    ? [
        listing.fuelCode ? codeLabel(t, 'marketplace.fuel', listing.fuelCode, listing.fuel) : null,
        listing.transmissionCode
          ? codeLabel(t, 'marketplace.transmission', listing.transmissionCode, listing.transmission)
          : null,
        listing.variant,
      ].filter(Boolean)
    : [];

  const onAccept = () =>
    confirm({
      title: t('offers.confirmAccept.title'),
      message: t('offers.confirmAccept.message', { amount: formatINR(offer.amount), name }),
      confirmLabel: t('offers.acceptCounter'),
      onConfirm: d.accept,
    });
  const onWithdraw = () =>
    confirm({
      title: t('offers.confirmWithdraw.title'),
      message: t('offers.confirmWithdraw.message'),
      confirmLabel: t('offers.withdraw'),
      cancelLabel: t('offers.keep'),
      onConfirm: d.withdraw,
    });
  const onCancelOrder = () =>
    confirm({
      title: t('offers.confirmCancelOrder.title'),
      message: t('offers.confirmCancelOrder.message'),
      confirmLabel: t('offers.cancelOrder'),
      cancelLabel: t('offers.keep'),
      onConfirm: d.cancel,
    });
  const openLoan = () =>
    navigation.navigate(ROUTES.LOAN_APPLICATION, {
      listingId: offer.listingId,
      orderId: order?.id ?? null,
      vehicleLabel: name,
      vehiclePrice: acceptedAmount,
    });

  // Answering a counter / withdrawing sits in the footer, in reach.
  let footer = null;
  if (offer.status === 'COUNTERED') {
    footer = (
      <View style={styles.footer}>
        <ButtonRow>
          <Button
            title={t('offers.acceptCounter')}
            onPress={onAccept}
            loading={d.busy === 'accept'}
            disabled={!!d.busy}
            style={styles.flex}
          />
          <Button
            title={t('offers.counterBack')}
            variant="outline"
            onPress={() => setCountering(true)}
            disabled={!!d.busy}
            style={styles.flex}
          />
        </ButtonRow>
        <Button
          title={t('offers.withdraw')}
          size="sm"
          variant="ghost"
          onPress={onWithdraw}
          loading={d.busy === 'withdraw'}
          disabled={!!d.busy}
        />
      </View>
    );
  } else if (offer.status === 'PENDING') {
    footer = (
      <Button
        title={t('offers.withdraw')}
        variant="outline"
        onPress={onWithdraw}
        loading={d.busy === 'withdraw'}
        disabled={!!d.busy}
      />
    );
  }

  return (
    <ScreenContainer
      scroll
      header={header}
      footer={footer}
      refreshControl={<AppRefreshControl refreshing={d.refreshing} onRefresh={d.refresh} />}
    >
      <FadeIn>
        {/* The vehicle, your offer and where it stands */}
        <Card style={styles.card}>
          <View style={styles.vehicleRow}>
            <View style={styles.thumb}>
              <VehicleImage source={listing?.image} style={styles.thumbImage} />
            </View>
            <View style={styles.flex}>
              <AppText variant="title" style={styles.name} numberOfLines={2}>
                {name}
              </AppText>
              {chips.length ? (
                <View style={styles.chips}>
                  {chips.map(c => (
                    <View key={c} style={styles.chip}>
                      <AppText style={styles.chipText}>{c}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.amounts}>
            <View style={styles.amountBlock}>
              <AppText variant="caption">{t('offers.yourOffer')}</AppText>
              <AppText variant="h3" style={styles.amount}>
                {yourAmount != null ? formatINR(yourAmount) : '—'}
              </AppText>
              {countered ? (
                <AppText variant="caption" color={colors.warning}>
                  {t('offers.counteredTo', { amount: formatINR(offer.amount) })}
                </AppText>
              ) : null}
            </View>
            <View style={styles.statusBlock}>
              <Badge label={t(status.labelKey)} tone={status.tone} />
              {offer.open && offer.expiresAt ? (
                <View style={styles.valid}>
                  <Icon name="clock" size={ms(12)} color={offer.expired ? colors.warning : colors.primary} />
                  <AppText variant="caption" color={offer.expired ? colors.warning : colors.primary}>
                    {expiresLabel(offer.expiresAt)}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
          {offer.declineReason ? (
            <AppText variant="caption" style={styles.meta}>
              {t('offers.declineReason', { reason: offer.declineReason })}
            </AppText>
          ) : null}
        </Card>

        {handedOver ? (
          <View style={[styles.card, styles.handedOver]}>
            <View style={styles.handedIcon}>
              <Icon name="check" size={ms(16)} color={colors.white} strokeWidth={3} />
            </View>
            <View style={styles.flex}>
              <AppText variant="title" color={colors.success}>
                {t('offers.order.HANDED_OVER')}
              </AppText>
              <AppText variant="caption">{t('offers.agreedAt', { amount: formatINR(acceptedAmount) })}</AppText>
            </View>
          </View>
        ) : null}

        <TitledCard title={t('offers.detail.progress')} style={styles.card}>
          <OfferTimeline steps={buildOfferTimeline(offer, order)} style={styles.timeline} />
        </TitledCard>

        {/* Accepted, order new: pay the token into escrow */}
        {tokenStep ? (
          <TitledCard title={t('offers.token.title')} style={styles.card}>
            <View style={styles.tokenBody}>
              <AmountRow label={t('offers.pay.acceptedAmount')} amount={acceptedAmount} strong />
              {pay?.amount != null ? (
                <>
                  <AmountRow label={t('offers.pay.tokenHeld')} amount={pay.amount} />
                  <AmountRow label={t('offers.pay.balance')} amount={Math.max(acceptedAmount - pay.amount, 0)} />
                </>
              ) : (
                <AppText variant="caption">{t('offers.pay.tokenNote')}</AppText>
              )}
              <InfoNote>{t('offers.pay.escrowNote')}</InfoNote>

              {pay?.phase === 'paying' ? (
                <Badge label={t('offers.pay.confirming')} tone="warning" size="sm" style={styles.selfStart} />
              ) : null}
              {pay?.phase === 'awaiting' ? (
                <View style={styles.awaiting}>
                  <AppText variant="caption" color={colors.warning}>
                    {t('offers.pay.awaiting')}
                  </AppText>
                  <Button title={t('offers.pay.checkAgain')} size="sm" variant="outline" fullWidth={false} onPress={d.checkAgain} />
                </View>
              ) : null}
              {pay?.phase === 'unavailable' || pay?.phase === 'failed' ? (
                <AppText variant="caption" color={pay.phase === 'failed' ? colors.danger : colors.body} accessibilityLiveRegion="polite">
                  {pay.message}
                </AppText>
              ) : null}

              {canPay ? (
                <>
                  <Button
                    title={t(payBusy ? 'offers.pay.paying' : pay?.phase === 'failed' ? 'offers.pay.retry' : 'offers.pay.button')}
                    onPress={d.payToken}
                    loading={payBusy}
                    disabled={!!d.busy}
                  />
                  <AppText variant="caption" align="center">
                    {t('offers.pay.consentStart')}
                    <AppText variant="caption" color={colors.primary} onPress={() => openWebPage('/terms')}>
                      {t('offers.pay.terms')}
                    </AppText>
                    {t('offers.pay.consentAnd')}
                    <AppText variant="caption" color={colors.primary} onPress={() => openWebPage('/refund_policy')}>
                      {t('offers.pay.refundPolicy')}
                    </AppText>
                    .
                  </AppText>
                </>
              ) : null}
              <ButtonRow>
                <Button
                  title={t('offers.cancelOrder')}
                  size="md"
                  variant="outline"
                  onPress={onCancelOrder}
                  loading={d.busy === 'cancel'}
                  disabled={!!d.busy || payBusy}
                  style={styles.flex}
                />
                <Button
                  title={t('offers.loan.button')}
                  size="md"
                  variant="outline"
                  onPress={openLoan}
                  disabled={payBusy}
                  style={styles.flex}
                />
              </ButtonRow>
            </View>
          </TitledCard>
        ) : null}

        {/* After the token: the order's status */}
        {offer.status === 'ACCEPTED' && !tokenStep && order && !handedOver ? (
          <Card style={styles.card}>
            <View style={styles.orderRow}>
              <Badge
                label={t((ORDER_STATUS[order.status] ?? ORDER_STATUS.CREATED).labelKey)}
                tone={(ORDER_STATUS[order.status] ?? ORDER_STATUS.CREATED).tone}
              />
              <AppText variant="subtitle">{t('offers.agreedAt', { amount: formatINR(acceptedAmount) })}</AppText>
            </View>
          </Card>
        ) : null}

        {/* Token paid: the buyer's own transfer documents */}
        {order?.status === 'TOKEN_PAID' ? (
          <Card style={styles.card}>
            <TransferChecklist orderId={order.id} role="BUYER" />
          </Card>
        ) : null}

        {/* Handed over: the purchase's documents */}
        {order && handedOver ? (
          <Card style={styles.card}>
            <TransferChecklist orderId={order.id} role="BUYER" mode="documents" />
          </Card>
        ) : null}

        {d.actionError ? (
          <AppText variant="caption" color={colors.danger} style={styles.card} accessibilityLiveRegion="polite">
            {d.actionError}
          </AppText>
        ) : null}
      </FadeIn>

      <CounterSheet
        visible={countering}
        title={t('offers.counterBack')}
        current={offer.amount}
        onClose={() => setCountering(false)}
        onSubmit={async amount => {
          await d.counter(amount);
          setCountering(false);
        }}
      />
      {dialog}
    </ScreenContainer>
  );
}

const THUMB = ms(72);

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  action: {
    marginTop: spacing.lg,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumb: {
    width: THUMB * 1.3,
    height: THUMB,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.input,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  flex: {
    flex: 1,
  },
  name: {
    fontSize: fs(16),
    lineHeight: fs(21),
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: ms(2),
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: fs(11),
    lineHeight: fs(15),
    color: colors.body,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  amountBlock: {
    flex: 1,
    gap: spacing.xxs,
  },
  amount: {
    fontSize: fs(20),
    lineHeight: fs(26),
  },
  statusBlock: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  valid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  meta: {
    marginTop: spacing.sm,
  },
  handedOver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.successLight,
  },
  handedIcon: {
    width: ms(30),
    height: ms(30),
    borderRadius: ms(15),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  timeline: {
    marginTop: spacing.md,
  },
  tokenBody: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  selfStart: {
    alignSelf: 'flex-start',
  },
  awaiting: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  orderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footer: {
    gap: spacing.xs,
  },
});

export default OfferDetails;
