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
  ScreenContainer,
  StatusView,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import useRemoteData from '../../../hooks/useRemoteData';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import {
  acceptOffer,
  cancelOrder,
  counterOffer,
  getMyOffers,
  withdrawOffer,
} from '../../../api/services/offer.api';
import { formatINR } from '../../../utils/format';
import { ROUTES } from '../../../navigation/routes';
import { currentHomeRoute } from '../../../navigation/homeRoute';
import { useT } from '../../../i18n';
import CounterSheet from '../components/CounterSheet';
import { vehicleName } from '../offerTime';
import OfferCard from './components/OfferCard';

// The buyer's offers (as the web's My offers), newest first: answer a seller's
// counter, counter back, cancel an offer, and follow an accepted one's order.
// Offers are binding for 48 hours.
function MyOffers({ navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { data, setData, loading, refreshing, error, refresh, reload } = useRemoteData(getMyOffers);
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
          onCancelOrder={() =>
            confirm({
              title: t('offers.confirmCancelOrder.title'),
              message: t('offers.confirmCancelOrder.message'),
              confirmLabel: t('offers.cancelOrder'),
              cancelLabel: t('offers.keep'),
              onConfirm: () => run(item, () => cancelOrder(item.order.id)),
            })
          }
        />
      );
    },
    [busyId, confirm, run, t],
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
          data={data}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              <AppText variant="subtitle" style={styles.intro}>
                {t('offers.intro')}
              </AppText>
              {actionError ? (
                <AppText variant="caption" color={colors.danger} style={styles.intro}>
                  {actionError}
                </AppText>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <StatusView title={t('offers.empty.title')} message={t('offers.empty.message')} style={styles.empty}>
              <Button
                title={t('offers.empty.browse')}
                size="md"
                onPress={() => navigation.navigate(currentHomeRoute(), { screen: ROUTES.MARKET })}
                style={styles.action}
              />
            </StatusView>
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
  empty: {
    marginTop: spacing.xxl,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default MyOffers;
