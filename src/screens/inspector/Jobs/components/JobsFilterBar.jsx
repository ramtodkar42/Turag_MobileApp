import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, DatePickerSheet, Icon, OptionSheet, SearchBar } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { ms } from '../../../../utils/responsive';
import { formatDateNumeric } from '../../../../utils/format';
import { cityLabel } from '../../../../utils/address';
import { useT } from '../../../../i18n';
import { STATUS_CHOICES, dayOffsetKey, hasActiveFilters, todayKey } from '../jobsFilter';
import FilterPill from './FilterPill';

// The earliest day the date pickers offer (old jobs stay in the queue).
const FIRST_DAY = '2024-01-01';

const kindLabel = (t, category) =>
  t(`account.booking.kind.${category === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'PASSENGER'}`);

// My jobs toolbar, as the web's: search, status chips with counts, Today /
// Next 7 days / a date range, city and vehicle type (only when the queue has
// more than one), and Clear. filters: EMPTY_FILTERS shape; onChange(patch);
// counts: { ALL, ASSIGNED, ... }; shown / total: for "3 of 8".
function JobsFilterBar({ filters, onChange, onClear, counts, cities, categories, shown, total, activeCount, style }) {
  const t = useT();
  const [sheet, setSheet] = useState(null); // 'from' | 'to' | 'city' | 'category'
  const close = () => setSheet(null);
  const today = todayKey();
  const week = dayOffsetKey(7);
  const isToday = filters.from === today && filters.to === today;
  const isWeek = filters.from === today && filters.to === week;
  const filtering = hasActiveFilters(filters);

  const statusLabel = value =>
    value === 'ALL' ? t('common.filter.all') : t(`inspector.jobs.status.${value}`);

  return (
    <View style={[styles.wrap, style]}>
      <SearchBar
        value={filters.q}
        onChangeText={q => onChange({ q })}
        placeholder={t('inspector.jobs.search')}
        left={<Icon name="search" size={ms(17)} color={colors.placeholder} />}
        right={
          filters.q ? (
            <Pressable
              onPress={() => onChange({ q: '' })}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={t('common.filter.clearSearch')}
            >
              <Icon name="close" size={ms(16)} color={colors.body} />
            </Pressable>
          ) : null
        }
        autoCorrect={false}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
        {STATUS_CHOICES.map(value => (
          <FilterPill
            key={value}
            accessibilityRole="tab"
            label={`${statusLabel(value)}  ${counts[value] ?? 0}`}
            selected={filters.status === value}
            onPress={() => onChange({ status: value })}
          />
        ))}
      </ScrollView>

      <View style={styles.extras}>
        <FilterPill
          label={t('inspector.jobs.today')}
          selected={isToday}
          onPress={() => onChange(isToday ? { from: '', to: '' } : { from: today, to: today })}
        />
        <FilterPill
          label={t('inspector.jobs.next7')}
          selected={isWeek}
          onPress={() => onChange(isWeek ? { from: '', to: '' } : { from: today, to: week })}
        />
        <FilterPill
          icon={<Icon name="calendar" size={ms(13)} color={filters.from ? colors.primary : colors.body} />}
          label={filters.from ? t('inspector.jobs.fromDate', { date: formatDateNumeric(filters.from) }) : t('inspector.jobs.from')}
          selected={!!filters.from}
          onPress={() => setSheet('from')}
          onClear={filters.from ? () => onChange({ from: '' }) : undefined}
          clearLabel={t('common.filter.clearDate')}
        />
        <FilterPill
          icon={<Icon name="calendar" size={ms(13)} color={filters.to ? colors.primary : colors.body} />}
          label={filters.to ? t('inspector.jobs.toDate', { date: formatDateNumeric(filters.to) }) : t('inspector.jobs.to')}
          selected={!!filters.to}
          onPress={() => setSheet('to')}
          onClear={filters.to ? () => onChange({ to: '' }) : undefined}
          clearLabel={t('common.filter.clearDate')}
        />
        {cities.length > 1 ? (
          <FilterPill
            icon={<Icon name="chevronDown" size={ms(13)} color={filters.city !== 'ALL' ? colors.primary : colors.body} />}
            label={filters.city === 'ALL' ? t('inspector.jobs.allCities') : cityLabel(filters.city)}
            selected={filters.city !== 'ALL'}
            onPress={() => setSheet('city')}
          />
        ) : null}
        {categories.length > 1 ? (
          <FilterPill
            icon={<Icon name="chevronDown" size={ms(13)} color={filters.category !== 'ALL' ? colors.primary : colors.body} />}
            label={filters.category === 'ALL' ? t('inspector.jobs.allTypes') : kindLabel(t, filters.category)}
            selected={filters.category !== 'ALL'}
            onPress={() => setSheet('category')}
          />
        ) : null}
      </View>

      <View style={styles.summary}>
        <AppText variant="caption" style={styles.flex}>
          {filtering
            ? t('inspector.jobs.countOf', { shown, total })
            : t('inspector.jobs.countActive', { count: activeCount })}
        </AppText>
        {filtering ? (
          <Pressable onPress={onClear} hitSlop={HIT_SLOP} accessibilityRole="button">
            <AppText variant="caption" color={colors.primary}>
              {t('common.filter.clear')}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <DatePickerSheet
        visible={sheet === 'from'}
        title={t('inspector.jobs.from')}
        value={filters.from || null}
        minDate={FIRST_DAY}
        maxDate={filters.to || undefined}
        onSelect={from => onChange({ from })}
        onClose={close}
      />
      <DatePickerSheet
        visible={sheet === 'to'}
        title={t('inspector.jobs.to')}
        value={filters.to || null}
        minDate={filters.from || FIRST_DAY}
        onSelect={to => onChange({ to })}
        onClose={close}
      />
      <OptionSheet
        visible={sheet === 'city'}
        title={t('inspector.jobs.city')}
        options={[
          { value: 'ALL', label: t('inspector.jobs.allCities') },
          ...cities.map(c => ({ value: c, label: cityLabel(c) })),
        ]}
        value={filters.city}
        onSelect={city => onChange({ city })}
        onClose={close}
      />
      <OptionSheet
        visible={sheet === 'category'}
        title={t('inspector.jobs.vehicleType')}
        options={[
          { value: 'ALL', label: t('inspector.jobs.allTypes') },
          ...categories.map(c => ({ value: c, label: kindLabel(t, c) })),
        ]}
        value={filters.category}
        onSelect={category => onChange({ category })}
        onClose={close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  extras: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});

export default JobsFilterBar;
