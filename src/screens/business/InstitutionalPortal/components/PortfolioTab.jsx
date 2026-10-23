import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { useT } from '../../../../i18n';
import FilterChips from '../../components/FilterChips';
import RemoteList from '../../components/RemoteList';
import RowCard from '../../components/RowCard';
import {
  AGEING_BUCKETS,
  CATEGORIES,
  CITIES,
  PORTFOLIO_STATUSES,
  ageingBucket,
  labelOr,
  listingStatus,
} from '../../statuses';
import usePortfolio from '../hooks/usePortfolio';

// Portfolio: the org's assets with status, ageing, location and channel -
// read-only, no money (the web shows only a valuation band, never a ₹).
function PortfolioTab({ orgId, top }) {
  const t = useT();
  const { remote, filters, setFilter, loadMore, loadingMore, moreError } = usePortfolio(orgId);

  const chips = useMemo(
    () => [
      {
        id: 'status',
        label: t('business.field.status'),
        value: filters.status,
        options: PORTFOLIO_STATUSES.map(v => ({ value: v, label: t(listingStatus(v).labelKey) })),
      },
      {
        id: 'category',
        label: t('business.field.category'),
        value: filters.category,
        options: CATEGORIES.map(v => ({ value: v, label: t(`business.category.${v}`) })),
      },
      {
        id: 'ageingBucket',
        label: t('business.field.ageing'),
        value: filters.ageingBucket,
        options: AGEING_BUCKETS.map(v => ({ value: v, label: t(ageingBucket(v).labelKey) })),
      },
      {
        id: 'location',
        label: t('business.field.location'),
        value: filters.location,
        options: CITIES.map(v => ({ value: v, label: t(`business.city.${v}`) })),
      },
    ],
    [filters, t],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const status = listingStatus(item.status);
      const ageing = ageingBucket(item.ageingBucket);
      const v = item.vehicle;
      return (
        <RowCard
          title={[v.make, v.model].filter(Boolean).join(' ') + (v.year ? ` · ${v.year}` : '')}
          badge={{ label: labelOr(t, status.labelKey, item.status), tone: status.tone }}
          lines={[
            [
              v.category ? labelOr(t, `business.category.${v.category}`, v.category) : null,
              v.fuel ? labelOr(t, `business.fuel.${v.fuel}`, v.fuel) : null,
              v.chassisLast6 ? t('business.portfolio.chassis', { last6: v.chassisLast6 }) : null,
            ]
              .filter(Boolean)
              .join(' · '),
            `${t('business.field.location')}: ${
              item.location ? labelOr(t, `business.city.${item.location}`, item.location) : t('business.notSet')
            }`,
            `${t('business.field.channel')}: ${labelOr(t, `business.channel.${item.channel}`, item.channel)}`,
            item.valuationBand ? t('business.portfolio.band', { band: item.valuationBand }) : null,
          ]}
          footer={
            <View style={styles.ageing}>
              <Badge
                label={`${labelOr(t, ageing.labelKey, item.ageingBucket)} · ${t('business.days', {
                  count: item.ageingDays,
                })}`}
                tone={ageing.tone}
                size="sm"
              />
            </View>
          }
        />
      );
    },
    [t],
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
          <FilterChips filters={chips} onChange={setFilter} style={styles.filters} />
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
              <Button
                title={t('business.loadMore')}
                variant="outline"
                size="md"
                loading={loadingMore}
                onPress={loadMore}
              />
            ) : null}
          </View>
        ) : null
      }
      empty={{ title: t('business.portfolio.empty.title'), message: t('business.portfolio.empty.message') }}
      errorTitle={t('business.portfolio.error')}
    />
  );
}

const styles = StyleSheet.create({
  filters: {
    marginTop: spacing.md,
    flexGrow: 0,
  },
  ageing: {
    marginTop: spacing.sm,
  },
  more: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});

export default PortfolioTab;
