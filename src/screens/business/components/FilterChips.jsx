import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip, OptionSheet } from '../../../components';
import { spacing } from '../../../theme';
import { useT } from '../../../i18n';

// A row of filter chips ("Fuel: All"); tapping one opens a sheet to pick its
// value - the phone version of the web's filter dropdowns. A chip with a
// value set is shown selected. Scrolls sideways when they don't fit.
// filters: [{ id, label, value, options: [{ label, value }] }]  ('' = All)
function FilterChips({ filters, onChange, style }) {
  const t = useT();
  const [openId, setOpenId] = useState(null);
  const open = filters.find(f => f.id === openId);
  const withAll = f => [{ label: t('business.filter.all'), value: '' }, ...f.options];

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={style}
      >
        {filters.map(f => {
          const picked = f.options.find(o => o.value === f.value);
          return (
            <Chip
              key={f.id}
              label={`${f.label}: ${picked ? picked.label : t('business.filter.all')}`}
              selected={!!picked}
              onPress={() => setOpenId(f.id)}
            />
          );
        })}
      </ScrollView>
      <OptionSheet
        visible={!!open}
        title={open?.label}
        options={open ? withAll(open) : []}
        value={open?.value ?? ''}
        onSelect={value => onChange(open.id, value)}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
});

export default FilterChips;
