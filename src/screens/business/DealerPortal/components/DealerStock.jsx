import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatINR } from '../../../../utils/format';
import useRemoteData from '../../../../hooks/useRemoteData';
import { browseDealerStock } from '../../../../api/services/business.api';
import { useT } from '../../../../i18n';
import FilterChips from '../../components/FilterChips';
import RemoteList from '../../components/RemoteList';
import RowCard from '../../components/RowCard';
import { CATEGORIES, FUELS, labelOr } from '../../statuses';

// Price caps for the "Max price" filter (the web takes any number; on a phone
// a few steps are quicker to pick).
const PRICE_CAPS = [200000, 500000, 800000, 1200000, 2000000];

// "Browse dealer stock": other dealers' approved (live) listings, filtered by
// category, fuel and a max price. No seller identity is ever shown.
function DealerStock({ top }) {
  const t = useT();
  const [filters, setFilters] = useState({ category: '', fuel: '', priceMax: '' });
  const remote = useRemoteData(
    () => browseDealerStock({ ...filters, priceMax: filters.priceMax || null }),
    [filters.category, filters.fuel, filters.priceMax],
  );

  const chips = useMemo(
    () => [
      {
        id: 'category',
        label: t('business.field.category'),
        value: filters.category,
        options: CATEGORIES.map(v => ({ value: v, label: t(`business.category.${v}`) })),
      },
      {
        id: 'fuel',
        label: t('business.field.fuel'),
        value: filters.fuel,
        options: FUELS.map(v => ({ value: v, label: t(`business.fuel.${v}`) })),
      },
      {
        id: 'priceMax',
        label: t('business.field.maxPrice'),
        value: filters.priceMax,
        options: PRICE_CAPS.map(v => ({ value: v, label: t('business.filter.upTo', { amount: formatINR(v) }) })),
      },
    ],
    [filters, t],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <RowCard
        title={[item.make, item.model, item.variant].filter(Boolean).join(' ') + (item.year ? ` · ${item.year}` : '')}
        lines={[
          [
            labelOr(t, `business.fuel.${item.fuel}`, item.fuel),
            labelOr(t, `business.category.${item.category}`, item.category),
            item.city ? labelOr(t, `business.city.${item.city}`, item.city) : null,
          ]
            .filter(Boolean)
            .join(' · '),
          item.grade ? t('business.dealer.grade', { grade: item.grade }) : null,
        ]}
        footer={
          <View style={styles.footer}>
            <AppText variant="caption">{t('business.field.askPrice')}</AppText>
            <AppText variant="title" color={colors.success} style={styles.price}>
              {item.askPrice != null ? formatINR(item.askPrice) : '—'}
            </AppText>
          </View>
        }
      />
    ),
    [t],
  );

  return (
    <RemoteList
      remote={remote}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      header={
        <>
          {top}
          <FilterChips
            filters={chips}
            onChange={(id, value) => setFilters(f => ({ ...f, [id]: value }))}
            style={styles.filters}
          />
        </>
      }
      empty={{ title: t('business.dealer.stockEmpty.title'), message: t('business.dealer.stockEmpty.message') }}
      errorTitle={t('business.dealer.stockError')}
    />
  );
}

const styles = StyleSheet.create({
  filters: {
    marginTop: spacing.md,
    flexGrow: 0,
  },
  footer: {
    marginTop: spacing.md,
  },
  price: {
    fontSize: fs(17),
    lineHeight: fs(23),
  },
});

export default DealerStock;
