import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppRefreshControl,
  AppText,
  Button,
  CardListSkeleton,
  FadeIn,
  Header,
  InfoNote,
  ScreenContainer,
  StatusView,
} from '../../../components';
import { spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { ERROR_CODES } from '../../../api/client';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import useSettlements from './useSettlements';
import SettlementSummary from './components/SettlementSummary';
import SettlementCard from './components/SettlementCard';


// Settlements (as the web's /sell/settlements): the payouts owed to the seller
// for their sales. A three-stat summary over the ledger, then each entry: what
// the seller receives (token - commission - GST), the account it goes to
// (masked) and, once paid, the bank reference and receipt. An entry with no
// amount yet shows a dash - never a guess. No route params.
function Settlements({ navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { data, loading, refreshing, error, errorCode, refresh, reload, summary, openingId, receiptError, openReceipt } =
    useSettlements();

  const openPayouts = useCallback(() => navigation.navigate(ROUTES.PAYOUT_ACCOUNTS), [navigation]);

  const renderItem = useCallback(
    ({ item }) => (
      <SettlementCard
        settlement={item}
        opening={openingId === item.id}
        error={receiptError?.id === item.id ? receiptError.message : ''}
        onAddAccount={openPayouts}
        onReceipt={openReceipt}
      />
    ),
    [openPayouts, openReceipt, openingId, receiptError],
  );

  const header = <Header onBack={navigation.goBack} title={t('payouts.settle.title')} />;
  const hasRows = !!data?.length;

  let body;
  if (loading) {
    body = <CardListSkeleton cards={[2, 3, 3]} style={styles.skeleton} />;
  } else if (error) {
    const signedOut = errorCode === ERROR_CODES.AUTH_REQUIRED;
    body = (
      <StatusView
        title={t(signedOut ? 'payouts.settle.signedOut.title' : 'payouts.settle.error.title')}
        message={t(signedOut ? 'payouts.settle.signedOut.message' : 'payouts.settle.tryAgain')}
      >
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
              <View style={styles.toolbar}>
                <Button
                  title={t('payouts.settle.payoutAccounts')}
                  size="sm"
                  variant="outline"
                  fullWidth={false}
                  onPress={openPayouts}
                />
              </View>
              {hasRows ? (
                <>
                  <SettlementSummary summary={summary} style={styles.summary} />
                  <AppText variant="title" style={styles.ledgerTitle}>
                    {t('payouts.settle.ledgerTitle')}
                  </AppText>
                </>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <StatusView
              title={t('payouts.settle.empty.title')}
              message={t('payouts.settle.empty.message')}
              style={styles.empty}
            >
              <Button
                title={t('payouts.settle.myListings')}
                size="md"
                onPress={() => navigation.navigate(ROUTES.MY_LISTINGS)}
                style={styles.action}
              />
            </StatusView>
          }
          ListFooterComponent={hasRows ? <InfoNote style={styles.footer}>{t('payouts.settle.footer')}</InfoNote> : null}
          refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      </FadeIn>
    );
  }

  return <ScreenContainer header={header}>{body}</ScreenContainer>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  skeleton: {
    marginTop: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  summary: {
    marginTop: spacing.md,
  },
  ledgerTitle: {
    marginTop: spacing.xl,
    fontSize: fs(16),
    lineHeight: fs(22),
  },
  empty: {
    marginTop: spacing.xxl,
  },
  action: {
    marginTop: spacing.lg,
  },
  footer: {
    marginTop: spacing.lg,
  },
});

export default Settlements;
