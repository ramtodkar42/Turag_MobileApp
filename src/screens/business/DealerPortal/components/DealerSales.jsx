import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, ChipTabs } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { formatINR } from '../../../../utils/format';
import { getDealerSales } from '../../../../api/services/business.api';
import { ROUTES } from '../../../../navigation/routes';
import { useLanguage, useT } from '../../../../i18n';
import RemoteList from '../../components/RemoteList';
import RowCard from '../../components/RowCard';
import { DEALER_SALE_FILTERS, PAYOUT_PROBLEM, dealerSaleStatus, labelOr, payoutLabelKey } from '../../statuses';
import useDealerRows from '../hooks/useDealerRows';
import SaleProgress from './SaleProgress';

// Sales (as the web's /dealer Sales): the sales on the dealership's cars,
// newest first, with In progress / Completed / Cancelled / All, each with its
// four steps. A sale completes once the RC transfer is done. The payout shows
// on the caller's own sales only (with "Add bank account" when it's missing).
// Own sales open that listing's page (handover there); a teammate's are read-only.
function DealerSales({ orgId, top, navigation }) {
  const t = useT();
  const language = useLanguage();
  const { remote, status, setStatus, loadMore, loadingMore, moreError } = useDealerRows(getDealerSales, orgId, 'active');

  const renderItem = useCallback(
    ({ item }) => {
      const badge = dealerSaleStatus(item.status);
      const v = item.vehicle;
      const payoutProblem = PAYOUT_PROBLEM.has(item.payoutStatus);
      return (
        <RowCard
          title={[v.make, v.model].filter(Boolean).join(' ') + (v.year ? ` · ${v.year}` : '')}
          badge={{ label: labelOr(t, badge.labelKey, item.status), tone: badge.tone }}
          lines={[item.listedByMe ? null : t('business.dealer.listedByTeammate')]}
          footer={
            <View>
              <View style={styles.amountRow}>
                <AppText variant="caption">{t('business.dealer.sale.agreed')}</AppText>
                <AppText variant="title" color={colors.success} style={styles.amount}>
                  {item.agreedPrice != null ? formatINR(item.agreedPrice) : '—'}
                </AppText>
              </View>
              {item.tokenAmount != null ? (
                <AppText variant="caption">{t('business.dealer.sale.token', { amount: formatINR(item.tokenAmount) })}</AppText>
              ) : null}
              <SaleProgress sale={item} language={language} />
              {item.payoutStatus ? (
                <View style={styles.payout}>
                  <AppText variant="caption" color={payoutProblem ? colors.danger : colors.body} style={styles.flex}>
                    {labelOr(t, payoutLabelKey(item.payoutStatus), item.payoutStatus)}
                  </AppText>
                  {item.payoutStatus === 'AWAITING_ACCOUNT' ? (
                    <Pressable
                      onPress={() => navigation.navigate(ROUTES.PAYOUT_ACCOUNTS)}
                      accessibilityRole="button"
                      hitSlop={ms(8)}
                    >
                      <AppText variant="label" color={colors.primary}>
                        {t('business.dealer.sale.addBank')}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
          onPress={
            item.listedByMe ? () => navigation.navigate(ROUTES.MY_LISTING, { listingId: item.listingId }) : undefined
          }
        />
      );
    },
    [language, navigation, t],
  );

  const page = remote.data;
  return (
    <RemoteList
      remote={remote}
      items={page?.items ?? []}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      header={
        <>
          {top}
          <ChipTabs
            tabs={DEALER_SALE_FILTERS.map(id => ({ id, label: t(`business.dealer.saleFilter.${id}`) }))}
            value={status}
            onChange={setStatus}
            style={styles.filters}
          />
        </>
      }
      footer={
        page?.nextCursor || moreError ? (
          <View style={styles.more}>
            {moreError ? (
              <AppText variant="caption" color={colors.danger} align="center">
                {moreError}
              </AppText>
            ) : null}
            {page?.nextCursor ? (
              <Button title={t('business.loadMore')} variant="outline" size="md" loading={loadingMore} onPress={loadMore} />
            ) : null}
          </View>
        ) : null
      }
      empty={{
        title: t(status === 'active' ? 'business.dealer.sales.emptyActive.title' : 'business.dealer.sales.empty.title'),
        message: t('business.dealer.sales.empty.message'),
      }}
      errorTitle={t('business.dealer.sales.error')}
    />
  );
}

const styles = StyleSheet.create({
  filters: {
    marginTop: spacing.md,
    flexGrow: 0,
  },
  flex: {
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing.sm,
    marginTop: spacing.sm,
  },
  amount: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  payout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  more: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});

export default DealerSales;
