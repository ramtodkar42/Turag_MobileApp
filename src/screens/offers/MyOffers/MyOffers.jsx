import { useCallback, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppRefreshControl,
  AppText,
  Button,
  CardListSkeleton,
  FadeIn,
  Header,
  ListFilterBar,
  ScreenContainer,
  StatusView,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import useRemoteData from '../../../hooks/useRemoteData';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import useListFilters from '../../../hooks/useListFilters';
import { acceptOffer, counterOffer, getMyOffers, withdrawOffer } from '../../../api/services/offer.api';
import { formatINR } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';
import { currentHomeRoute } from '../../../navigation/homeRoute';
import { tNow, useT } from '../../../i18n';
import { OFFER_STATUS } from '../../account/statuses';
import CounterSheet from '../components/CounterSheet';
import { vehicleName } from '../offerTime';
import OfferCard from './components/OfferCard';

const statusLabel = status => tNow((OFFER_STATUS[status] ?? OFFER_STATUS.PENDING).labelKey);

// As the web's My offers toolbar: newest / oldest / highest / lowest amount.
const SORTS = [
  { value: 'newest', compare: (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) },
  { value: 'oldest', compare: (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0) },
  { value: 'highest', compare: (a, b) => (b.amount ?? 0) - (a.amount ?? 0) },
  { value: 'lowest', compare: (a, b) => (a.amount ?? 0) - (b.amount ?? 0) },
];

// The buyer's offers (as the web's My offers), newest first: search, status
// tabs, a day and the order to narrow them down; answer a seller's counter,
// counter back, cancel an offer, or open one (its progress, paying the token
// and the transfer documents). Offers are binding for 48 hours.
function MyOffers({ navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { data, setData, loading, refreshing, error, refresh, reload } = useRemoteData(getMyOffers);
  const filters = useListFilters(data, {
    statusOf: o => o.status,
    searchText: o => [vehicleName(o.vehicle, ''), statusLabel(o.status), o.amount].join(' '),
    timeOf: o => o.createdAt,
    sorts: SORTS,
  });
  const sortOptions = SORTS.map(s => ({ value: s.value, label: t(`offers.sort.${s.value}`) }));
  const { confirm, dialog } = useConfirmDialog();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [countering, setCountering] = useState(null); // offer

  // Runs an action for one offer; on success puts the updated offer in the
  // list, then reloads quietly (orders, other offers may have changed).
  const run = useCallback(
    async (offer, action) => {
      setBusyId(offer.id);
      setActionError('');
      try {
        const updated = await action();
        if (updated?.id) {
          setData(list => list.map(o => (o.id === updated.id ? { ...o, ...updated } : o)));
        }
        reload();
      } catch (e) {
        setActionError(e.message || t('offers.error.action'));
        reload();
      } finally {
        setBusyId(null);
      }
    },
    [reload, setData, t],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const name = vehicleName(item.vehicle, t('offers.offer'));
      return (
        <OfferCard
          offer={item}
          busy={busyId === item.id}
          onOpen={offer => navigation.navigate(ROUTES.OFFER_DETAILS, { offerId: offer.id })}
          onAccept={() =>
            confirm({
              title: t('offers.confirmAccept.title'),
              message: t('offers.confirmAccept.message', { amount: formatINR(item.amount), name }),
              confirmLabel: t('offers.acceptCounter'),
              onConfirm: () => run(item, () => acceptOffer(item.id)),
            })
          }
          onCounter={() => setCountering(item)}
          onWithdraw={() =>
            confirm({
              title: t('offers.confirmWithdraw.title'),
              message: t('offers.confirmWithdraw.message'),
              confirmLabel: t('offers.withdraw'),
              cancelLabel: t('offers.keep'),
              onConfirm: () => run(item, () => withdrawOffer(item.id)),
            })
          }
        />
      );
    },
    [busyId, confirm, navigation, run, t],
  );

  const header = <Header onBack={navigation.goBack} title={t('offers.title')} />;

  let body;
  if (loading) {
    body = <CardListSkeleton cards={[3, 3, 3]} style={styles.skeleton} />;
  } else if (error) {
    body = (
      <StatusView title={t('offers.error.title')} message={error}>
        <Button title={t('common.retry')} size="md" onPress={reload} style={styles.action} />
      </StatusView>
    );
  } else {
    body = (
      <FadeIn offset={0} style={styles.flex}>
        <FlatList
          data={filters.filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            <>
              <AppText variant="subtitle" style={styles.intro}>
                {t('offers.intro')}
              </AppText>
              {data?.length ? (
                <ListFilterBar
                  filters={filters}
                  labelOf={statusLabel}
                  searchPlaceholder={t('offers.search')}
                  showDate
                  sortOptions={sortOptions}
                  style={styles.filters}
                />
              ) : null}
              {actionError ? (
                <AppText variant="caption" color={colors.danger} style={styles.intro}>
                  {actionError}
                </AppText>
              ) : null}
            </>
          }
          ListEmptyComponent={
            filters.filtering ? (
              <StatusView title={t('common.filter.noMatch')} message={t('common.filter.noMatchHint')} style={styles.empty}>
                <Button title={t('common.filter.clear')} size="md" variant="outline" onPress={filters.clear} style={styles.action} />
              </StatusView>
            ) : (
            <StatusView title={t('offers.empty.title')} message={t('offers.empty.message')} style={styles.empty}>
              <Button
                title={t('offers.empty.browse')}
                size="md"
                onPress={() => navigation.navigate(currentHomeRoute(), { screen: ROUTES.MARKET })}
                style={styles.action}
              />
            </StatusView>
            )
          }
          refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      </FadeIn>
    );
  }

  return (
    <ScreenContainer header={header}>
      {body}
      <CounterSheet
        visible={!!countering}
        title={t('offers.counterBack')}
        current={countering?.amount}
        onClose={() => setCountering(null)}
        onSubmit={async amount => {
          const offer = countering;
          const updated = await counterOffer(offer.id, amount);
          setCountering(null);
          setData(list => list.map(o => (o.id === updated.id ? { ...o, ...updated } : o)));
          reload();
        }}
      />
      {dialog}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  skeleton: {
    marginTop: spacing.md,
  },
  intro: {
    marginTop: spacing.sm,
  },
  filters: {
    marginTop: spacing.md,
  },
  empty: {
    marginTop: spacing.xxl,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default MyOffers;
