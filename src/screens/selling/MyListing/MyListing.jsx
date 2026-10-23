import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Badge,
  Button,
  ButtonRow,
  Card,
  CardListSkeleton,
  EyeIcon,
  FadeIn,
  Header,
  InfoNote,
  ScreenContainer,
  StatusTimeline,
  StatusView,
  TitledCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { timeAgo } from '../../../utils/date';
import useRemoteData from '../../../hooks/useRemoteData';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { acceptOffer, counterOffer, declineOffer, handoverOrder } from '../../../api/services/offer.api';
import {
  getMyListing,
  submitListing,
  updateListingPrice,
  withdrawListing,
} from '../../../api/services/sellerListing.api';
import { loadGarage } from '../../../store/garageStore';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import CounterSheet from '../../offers/components/CounterSheet';
import TransferChecklist from '../../offers/components/TransferChecklist';
import { LISTING_STATUS, ORDER_STEPS } from '../../account/statuses';
import ReceivedOfferRow from './components/ReceivedOfferRow';

// The seller's own listing (My listings, a new listing, offer notifications),
// as the web's listing page: status, asking price (change it while draft /
// live), Submit for review (draft), Withdraw, the offers it received -
// Accept / Counter / Decline - and, once one is accepted, the order's progress;
// after the buyer pays the token: the transfer forms and "Confirm handover".
// params: { listingId }
function MyListing({ navigation, route }) {
  const t = useT();
  const { listingId } = route.params;
  const { data, setData, loading, refreshing, error, errorCode, refresh, reload } = useRemoteData(
    () => getMyListing(listingId),
    [listingId],
  );
  const { confirm, dialog } = useConfirmDialog();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [countering, setCountering] = useState(null);
  const [editingPrice, setEditingPrice] = useState(false);
  const [listingBusy, setListingBusy] = useState(null); // 'submit' | 'withdraw'
  const [transferReady, setTransferReady] = useState(false);
  const [handingOver, setHandingOver] = useState(false);

  // Runs a change to the listing itself; the updated listing replaces the old.
  const changeListing = async (kind, action) => {
    setListingBusy(kind);
    setActionError('');
    try {
      const listing = await action();
      setData(prev => ({ ...prev, listing }));
      loadGarage();
    } catch (e) {
      setActionError(e.message || t('offers.error.action'));
      reload();
    } finally {
      setListingBusy(null);
    }
  };

  // Runs an action on one offer, then reloads (accepting reserves the
  // vehicle and declines the other offers).
  const run = useCallback(
    async (offer, action) => {
      setBusyId(offer.id);
      setActionError('');
      try {
        await action();
      } catch (e) {
        setActionError(e.message || t('offers.error.action'));
      } finally {
        await reload();
        setBusyId(null);
      }
    },
    [reload, t],
  );

  const header = <Header onBack={navigation.goBack} title={t('selling.title')} />;

  if (loading) {
    return (
      <ScreenContainer scroll header={header}>
        <CardListSkeleton cards={[3, 5, 2]} style={styles.card} />
      </ScreenContainer>
    );
  }
  if (error) {
    const notFound = errorCode === 'LISTING_NOT_FOUND' || errorCode === 'NOT_FOUND';
    return (
      <ScreenContainer header={header}>
        <StatusView
          title={t(notFound ? 'selling.notFound.title' : 'selling.error.title')}
          message={notFound ? t('selling.notFound.message') : error}
        >
          <Button
            title={notFound ? t('common.back') : t('common.retry')}
            size="md"
            onPress={notFound ? navigation.goBack : reload}
            style={styles.action}
          />
        </StatusView>
      </ScreenContainer>
    );
  }

  const { listing, offers } = data;
  const status = LISTING_STATUS[listing.status] ?? LISTING_STATUS.DRAFT;
  const name = [listing.vehicle.make, listing.vehicle.model, listing.vehicle.year].filter(Boolean).join(' ');
  const accepted = offers.find(o => o.status === 'ACCEPTED' && o.order);
  const order = accepted?.order;

  const onHandover = () =>
    confirm({
      title: t('selling.handover.confirmTitle'),
      message: t('selling.handover.confirmMessage', { amount: formatINR(order.agreedPrice) }),
      confirmLabel: t('selling.handover.button'),
      cancelLabel: t('offers.keep'),
      onConfirm: async () => {
        setHandingOver(true);
        setActionError('');
        try {
          await handoverOrder(order.id);
          loadGarage();
        } catch (e) {
          setActionError(e.message || t('offers.error.action'));
        } finally {
          await reload();
          setHandingOver(false);
        }
      },
    });

  const onWithdraw = () =>
    confirm({
      title: t('selling.confirmWithdraw.title'),
      message: t('selling.confirmWithdraw.message'),
      confirmLabel: t('selling.withdraw'),
      cancelLabel: t('offers.keep'),
      onConfirm: () => changeListing('withdraw', () => withdrawListing(listing.id, listing.version)),
    });

  const withdrawButton = listing.canWithdraw ? (
    <Button
      title={t('selling.withdraw')}
      variant="outline"
      onPress={onWithdraw}
      loading={listingBusy === 'withdraw'}
      disabled={!!listingBusy}
      style={listing.canSubmit ? styles.flex : null}
    />
  ) : null;
  let footer = withdrawButton;
  if (listing.canSubmit) {
    footer = (
      <ButtonRow>
        {withdrawButton}
        <Button
          title={t('selling.submit')}
          onPress={() => changeListing('submit', () => submitListing(listing.id))}
          loading={listingBusy === 'submit'}
          disabled={!!listingBusy}
          style={styles.flex}
        />
      </ButtonRow>
    );
  }

  return (
    <ScreenContainer
      scroll
      header={header}
      footer={footer}
      refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <FadeIn>
        <Card style={styles.card}>
          <View style={styles.top}>
            <AppText variant="h3" style={styles.name}>
              {name}
            </AppText>
            <Badge label={t(status.labelKey)} tone={status.tone} />
          </View>
          {listing.vehicle.variant ? <AppText variant="caption">{listing.vehicle.variant}</AppText> : null}
          <AppText variant="caption" style={styles.price}>
            {t('selling.askingPrice')}
          </AppText>
          <View style={styles.priceRow}>
            <AppText variant="h2" color={colors.success} style={styles.priceValue}>
              {listing.askPrice != null ? formatINR(listing.askPrice) : '—'}
            </AppText>
            {listing.canEditPrice ? (
              <Button
                title={t('selling.changePrice')}
                size="sm"
                variant="outline"
                onPress={() => setEditingPrice(true)}
                disabled={!!listingBusy}
              />
            ) : null}
          </View>
          {listing.status === 'LIVE' ? (
            <AppText variant="caption" style={styles.liveNote}>
              {t('selling.liveNote')}
            </AppText>
          ) : null}
          <AppText variant="caption">
            {[
              listing.publishedAt
                ? t('selling.published', { time: timeAgo(listing.publishedAt) })
                : listing.createdAt
                  ? t('selling.created', { time: timeAgo(listing.createdAt) })
                  : null,
              t('selling.views', { count: listing.viewCount }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
          {/* As the web: what buyers will see (the card, the note, the report). */}
          <Button
            title={t('selling.preview.open')}
            size="sm"
            variant="outline"
            leftIcon={<EyeIcon size={ms(15)} color={colors.primary} />}
            onPress={() => navigation.navigate(ROUTES.LISTING_PREVIEW, { listing })}
            style={styles.preview}
          />
        </Card>

        {listing.status === 'REJECTED' ? (
          <InfoNote style={styles.card}>
            {t('selling.rejected', { reason: listing.moderationReason ?? '—' })}
          </InfoNote>
        ) : null}

        {listing.sellerNote ? (
          <TitledCard title={t('selling.noteToBuyers')} style={styles.card}>
            <AppText variant="subtitle" style={styles.noteText}>
              {listing.sellerNote}
            </AppText>
          </TitledCard>
        ) : null}

        {listing.takesOffers ? (
          <TitledCard
            title={t('selling.offersReceived')}
            right={offers.length ? <AppText variant="caption">{offers.length}</AppText> : null}
            style={styles.card}
          >
            {offers.length === 0 ? (
              <AppText variant="subtitle" style={styles.empty}>
                {t('selling.noOffers')}
              </AppText>
            ) : (
              offers.map((offer, index) => (
                <ReceivedOfferRow
                  key={offer.id}
                  offer={offer}
                  first={index === 0}
                  busy={busyId === offer.id}
                  onAccept={() =>
                    confirm({
                      title: t('selling.confirmAccept.title'),
                      message: t('selling.confirmAccept.message', { amount: formatINR(offer.amount) }),
                      confirmLabel: t('selling.accept'),
                      onConfirm: () => run(offer, () => acceptOffer(offer.id)),
                    })
                  }
                  onCounter={() => setCountering(offer)}
                  onDecline={() =>
                    confirm({
                      title: t('selling.confirmDecline.title'),
                      message: t('selling.confirmDecline.message', { amount: formatINR(offer.amount) }),
                      confirmLabel: t('selling.decline'),
                      cancelLabel: t('offers.keep'),
                      onConfirm: () => run(offer, () => declineOffer(offer.id)),
                    })
                  }
                />
              ))
            )}
          </TitledCard>
        ) : (
          <InfoNote style={styles.card}>
            {t(`selling.statusNote.${LISTING_STATUS[listing.status] ? listing.status : 'DRAFT'}`)}
          </InfoNote>
        )}

        {order ? (
          <TitledCard title={t('selling.order.title')} style={styles.card}>
            <AppText variant="subtitle" style={styles.orderLine}>
              {t('offers.agreedAt', { amount: formatINR(order.agreedPrice) })}
            </AppText>
            {order.status === 'CANCELLED' ? (
              <AppText variant="subtitle" color={colors.danger} style={styles.orderLine}>
                {t('selling.order.cancelled')}
              </AppText>
            ) : (
              <>
                <StatusTimeline
                  steps={ORDER_STEPS.map(step => t(`selling.orderStep.${step}`))}
                  currentStep={Math.max(0, ORDER_STEPS.indexOf(order.status))}
                  style={styles.timeline}
                />
                {order.status === 'CREATED' ? (
                  <InfoNote style={styles.orderNote}>{t('selling.order.waitingToken')}</InfoNote>
                ) : null}
              </>
            )}
          </TitledCard>
        ) : null}

        {/* Token paid: the seller provides the transfer forms, then confirms
            handover (as the web: only once Forms 29 / 30 are in). */}
        {order && order.status !== 'CREATED' && order.status !== 'CANCELLED' ? (
          <Card style={styles.card}>
            <TransferChecklist orderId={order.id} role="SELLER" onReadyChange={setTransferReady} />
            {order.status === 'TOKEN_PAID' ? (
              <View style={styles.handover}>
                <Button
                  title={t(handingOver ? 'selling.handover.confirming' : 'selling.handover.button')}
                  onPress={onHandover}
                  loading={handingOver}
                  disabled={!transferReady || handingOver}
                />
                <AppText variant="caption" align="center">
                  {t(transferReady ? 'selling.handover.ready' : 'selling.handover.needForms')}
                </AppText>
              </View>
            ) : null}
          </Card>
        ) : null}

        {actionError ? (
          <AppText variant="caption" color={colors.danger} style={styles.card}>
            {actionError}
          </AppText>
        ) : null}
      </FadeIn>

      <CounterSheet
        visible={editingPrice}
        title={t('selling.priceTitle')}
        current={listing.askPrice}
        fieldLabel={t('selling.priceLabel')}
        submitLabel={t('selling.priceSave')}
        onClose={() => setEditingPrice(false)}
        onSubmit={async amount => {
          const updated = await updateListingPrice(listing.id, amount, listing.version);
          setEditingPrice(false);
          setData(prev => ({ ...prev, listing: updated }));
        }}
      />
      <CounterSheet
        visible={!!countering}
        title={t('selling.counterTitle')}
        current={countering?.amount}
        onClose={() => setCountering(null)}
        onSubmit={async amount => {
          await counterOffer(countering.id, amount);
          setCountering(null);
          reload();
        }}
      />
      {dialog}
    </ScreenContainer>
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
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  price: {
    marginTop: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  preview: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  liveNote: {
    marginTop: spacing.xxs,
  },
  noteText: {
    marginTop: spacing.xs,
    fontSize: fs(13),
    lineHeight: fs(19),
  },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  priceValue: {
    fontSize: fs(24),
    lineHeight: fs(31),
  },
  empty: {
    marginTop: spacing.sm,
  },
  orderLine: {
    marginTop: spacing.xs,
  },
  timeline: {
    marginTop: spacing.md,
  },
  orderNote: {
    marginTop: spacing.sm,
  },
  handover: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default MyListing;
