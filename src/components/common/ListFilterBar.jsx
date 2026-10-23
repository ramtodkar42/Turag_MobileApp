import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import SearchBar from './SearchBar';
import Icon from '../icons/Icon';
import DatePickerSheet from '../feedback/DatePickerSheet';
import OptionSheet from '../feedback/OptionSheet';
import { colors, fonts, radius, spacing } from '../../theme';
import { HIT_SLOP } from '../../constants/layout';
import { fs, ms } from '../../utils/responsive';
import { formatDateNumeric } from '../../utils/format';
import { useT } from '../../i18n';

// The days the date filter offers: any (past bookings and upcoming ones).
const FIRST_DAY = '2024-01-01';

// One pill (a status tab, the day, the sort).
function Pill({ label, selected, onPress, icon, onClear, clearLabel, accessibilityRole = 'button' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.pill, selected && styles.pillOn, pressed && styles.pressed]}
    >
      {icon}
      <AppText style={[styles.pillText, selected && styles.pillTextOn]} numberOfLines={1}>
        {label}
      </AppText>
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel={clearLabel}>
          <Icon name="close" size={ms(13)} color={colors.primary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

// Search, status tabs (All + each status, with counts), and optionally a day
// and a sort - the web's list toolbar. filters: useListFilters();
// labelOf(status): the tab's name; sortOptions: [{ value, label }].
function ListFilterBar({ filters, labelOf, searchPlaceholder, showDate = false, sortOptions, style }) {
  const t = useT();
  const [dateOpen, setDateOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortLabel = sortOptions?.find(o => o.value === filters.sort)?.label;

  return (
    <View style={[styles.wrap, style]}>
      <SearchBar
        value={filters.query}
        onChangeText={filters.setQuery}
        placeholder={searchPlaceholder}
        left={<Icon name="search" size={ms(17)} color={colors.placeholder} />}
        right={
          filters.query ? (
            <Pressable
              onPress={() => filters.setQuery('')}
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
      >
        {filters.tabs.map(tab => (
          <Pill
            key={tab.value}
            accessibilityRole="tab"
            label={`${tab.value === 'ALL' ? t('common.filter.all') : labelOf(tab.value)}  ${tab.count}`}
            selected={filters.status === tab.value}
            onPress={() => filters.setStatus(tab.value)}
          />
        ))}
      </ScrollView>

      {showDate || sortOptions ? (
        <View style={styles.extras}>
          {showDate ? (
            <Pill
              icon={<Icon name="calendar" size={ms(13)} color={filters.date ? colors.primary : colors.body} />}
              label={filters.date ? formatDateNumeric(filters.date) : t('common.filter.anyDate')}
              selected={!!filters.date}
              onPress={() => setDateOpen(true)}
              onClear={filters.date ? () => filters.setDate(null) : undefined}
              clearLabel={t('common.filter.clearDate')}
            />
          ) : null}
          {sortOptions ? (
            <Pill label={t('common.filter.sortBy', { sort: sortLabel })} onPress={() => setSortOpen(true)} />
          ) : null}
          {filters.filtering ? (
            <Pressable onPress={filters.clear} hitSlop={HIT_SLOP} accessibilityRole="button" style={styles.clear}>
              <AppText variant="caption" color={colors.primary}>
                {t('common.filter.clear')}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showDate ? (
        <DatePickerSheet
          visible={dateOpen}
          title={t('common.filter.pickDate')}
          value={filters.date}
          minDate={FIRST_DAY}
          onSelect={filters.setDate}
          onClose={() => setDateOpen(false)}
        />
      ) : null}
      {sortOptions ? (
        <OptionSheet
          visible={sortOpen}
          title={t('common.filter.sort')}
          options={sortOptions}
          value={filters.sort}
          onSelect={filters.setSort}
          onClose={() => setSortOpen(false)}
        />
      ) : null}
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: ms(34),
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pillOn: {
    borderColor: colors.primary,
    backgroundColor: colors.dangerLight,
  },
  pressed: {
    opacity: 0.7,
  },
  pillText: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(12.5),
    lineHeight: fs(17),
    color: colors.body,
  },
  pillTextOn: {
    color: colors.primary,
  },
  clear: {
    paddingHorizontal: spacing.xs,
  },
});

export default ListFilterBar;
