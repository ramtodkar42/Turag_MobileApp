import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ChipTabs } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatINR } from '../../../../utils/format';
import { formatDayTime, timeAgo } from '../../../../utils/date';
import { getDealerOffers } from '../../../../api/services/business.api';
import { ROUTES } from '../../../../navigation/routes';
import { useLanguage, useT } from '../../../../i18n';
import RemoteList from '../../components/RemoteList';
import RowCard from '../../components/RowCard';
import { DEALER_OFFER_FILTERS, dealerOfferStatus, labelOr } from '../../statuses';
import useDealerRows from '../hooks/useDealerRows';

const DAY_MS = 24 * 60 * 60 * 1000;

// Still open: the seller's turn (PENDING) or the buyer's (COUNTERED), not expired.
const isOpen = offer =>
  (offer.status === 'PENDING' || offer.status === 'COUNTERED') && (offer.expiresAt ?? 0) > Date.now();

// Offers (as the web's /dealer Offers): every offer on the dealership's cars,
// newest first, with Open / Accepted / Closed / All. Only the person who listed
// a car can answer its offers: their rows open that listing's page (accept,
// counter or decline there); a teammate's are read-only.
function DealerOffers({ orgId, top, navigation }) {
  const t = useT();
  const language = useLanguage();
  const { remote, status, setStatus, loadMore, loadingMore, moreError } = useDealerRows(getDealerOffers, orgId, 'open');

  const renderItem = useCallback(
    ({ item }) => {
      const badge = dealerOfferStatus(item.status);
      const open = isOpen(item);
      const yourTurn = item.listedByMe && open && item.status === 'PENDING';
      const soon = open && item.expiresAt - Date.now() < DAY_MS;
      const pct = item.askPrice ? Math.round((item.amount / item.askPrice) * 100) : null;
      const v = item.vehicle;
      let counter = null;
      if (item.lastCounter != null) {
        counter = t(item.lastCounterBy === 'SELLER' ? 'business.dealer.offer.youCountered' : 'business.dealer.offer.buyerCountered', {
          amount: formatINR(item.lastCounter),
        });
        if (item.status === 'COUNTERED' && open) counter = `${counter} ${t('business.dealer.offer.waitingBuyer')}`;
      }
      return (
        <RowCard
          title={[v.make, v.model].filter(Boolean).join(' ') + (v.year ? ` · ${v.year}` : '')}
          badge={{ label: labelOr(t, badge.labelKey, item.status), tone: badge.tone }}
          lines={[
            [
              item.createdAt ? t('business.dealer.offer.received', { when: timeAgo(item.createdAt) }) : null,
              item.listedByMe ? null : t('business.dealer.listedByTeammate'),
            ]
              .filter(Boolean)
              .join(' · '),
            counter,
          ]}
          footer={
            <View style={styles.footer}>
              <View style={styles.amountRow}>
                <AppText variant="title" color={colors.success} style={styles.amount}>
                  {item.amount != null ? formatINR(item.amount) : '—'}
                </AppText>
                {pct != null ? (
                  <AppText variant="caption" style={styles.pct}>
                    {t('business.dealer.offer.ofAsk', { pct, ask: formatINR(item.askPrice) })}
                  </AppText>
                ) : null}
              </View>
              {open && item.expiresAt ? (
                <AppText variant="caption" color={soon ? colors.danger : colors.body}>
                  {t('business.dealer.offer.expires', { date: formatDayTime(item.expiresAt, language) })}
                </AppText>
              ) : null}
              {yourTurn ? (
                <AppText variant="label" color={colors.primary} style={styles.cta}>
                  {t('business.dealer.offer.answer')}
                </AppText>
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
            tabs={DEALER_OFFER_FILTERS.map(id => ({ id, label: t(`business.dealer.offerFilter.${id}`) }))}
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
        title: t(status === 'open' ? 'business.dealer.offers.emptyOpen.title' : 'business.dealer.offers.empty.title'),
        message: t(status === 'open' ? 'business.dealer.offers.emptyOpen.message' : 'business.dealer.offers.empty.message'),
      }}
      errorTitle={t('business.dealer.offers.error')}
    />
  );
}

const styles = StyleSheet.create({
  filters: {
    marginTop: spacing.md,
    flexGrow: 0,
  },
  footer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing.sm,
  },
  amount: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  pct: {
    flexShrink: 1,
  },
  cta: {
    marginTop: spacing.xs,
  },
  more: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});

export default DealerOffers;
