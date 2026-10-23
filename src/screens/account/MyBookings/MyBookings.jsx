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
import { cancelMyBooking, getMyBookings } from '../../../api/services/booking.api';
import { ROUTES } from '../../../navigation/routes';
import { tNow, useT } from '../../../i18n';
import { BOOKING_STATUS } from '../statuses';
import BookingRow from './components/BookingRow';

const statusLabel = status => tNow((BOOKING_STATUS[status] ?? BOOKING_STATUS.REQUESTED).labelKey);

// What a search looks in (as the web): type, city, pincode, booking id, status, address.
const searchText = b =>
  [
    tNow(`account.booking.kind.${b.category === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'PASSENGER'}`),
    b.city,
    b.pincode,
    b.id,
    statusLabel(b.status),
    b.address,
  ].join(' ');

// My inspections (Profile), as the web's list: every doorstep booking, newest
// first, with its status; search, status tabs and a day to narrow it down;
// open one, view its report, cancel while allowed, or book a new one.
function MyBookings({ navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { data, setData, loading, refreshing, error, refresh, reload } = useRemoteData(getMyBookings);
  const filters = useListFilters(data, { statusOf: b => b.status, searchText, timeOf: b => b.slotAt });
  const { confirm, dialog } = useConfirmDialog();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const onCancel = useCallback(
    booking =>
      confirm({
        title: t('account.booking.cancel.title'),
        message: t('account.booking.cancel.message'),
        confirmLabel: t('account.booking.cancel.confirm'),
        cancelLabel: t('account.booking.cancel.keep'),
        onConfirm: async () => {
          setBusyId(booking.id);
          setActionError('');
          try {
            const updated = await cancelMyBooking(booking.id);
            setData(list => list.map(b => (b.id === updated.id ? updated : b)));
          } catch (e) {
            setActionError(e.message || t('account.booking.cancel.error'));
            reload();
          } finally {
            setBusyId(null);
          }
        },
      }),
    [confirm, reload, setData, t],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <BookingRow
        booking={item}
        busy={busyId === item.id}
        onOpen={booking => navigation.navigate(ROUTES.BOOKING_DETAILS, { bookingId: booking.id })}
        onReport={booking => navigation.navigate(ROUTES.INSPECTION_REPORT, { inspectionId: booking.inspectionId })}
        onReceipt={booking => navigation.navigate(ROUTES.BOOKING_RECEIPT, { booking })}
        onCancel={onCancel}
      />
    ),
    [busyId, navigation, onCancel],
  );

  let body;
  if (loading) {
    body = <CardListSkeleton cards={[2, 2, 2]} style={styles.skeleton} />;
  } else if (error) {
    body = (
      <StatusView title={t('account.list.error')} message={error}>
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
                {t('account.list.subtitle')}
              </AppText>
              {data?.length ? (
                <ListFilterBar
                  filters={filters}
                  labelOf={statusLabel}
                  searchPlaceholder={t('account.list.search')}
                  showDate
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
              <StatusView title={t('account.list.empty.title')} message={t('account.list.empty.message')} style={styles.empty} />
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
    <ScreenContainer
      header={<Header onBack={navigation.goBack} title={t('account.list.title')} />}
      footer={
        <Button title={t('account.list.book')} onPress={() => navigation.navigate(ROUTES.BOOK_APPOINTMENT, {})} />
      }
    >
      {body}
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

export default MyBookings;
