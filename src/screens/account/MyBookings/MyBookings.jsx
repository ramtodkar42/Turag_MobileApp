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
import { cancelMyBooking, getMyBookings } from '../../../api/services/booking.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import BookingRow from './components/BookingRow';

// My inspections (Profile), as the web's list: every doorstep booking, newest
// first, with its status; open one, view its report, cancel while allowed,
// or book a new one.
function MyBookings({ navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { data, setData, loading, refreshing, error, refresh, reload } = useRemoteData(getMyBookings);
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
          data={data}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              <AppText variant="subtitle" style={styles.intro}>
                {t('account.list.subtitle')}
              </AppText>
              {actionError ? (
                <AppText variant="caption" color={colors.danger} style={styles.intro}>
                  {actionError}
                </AppText>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <StatusView title={t('account.list.empty.title')} message={t('account.list.empty.message')} style={styles.empty} />
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
  empty: {
    marginTop: spacing.xxl,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default MyBookings;
