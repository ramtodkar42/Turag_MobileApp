import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { OptionSheet } from '../../../../components';
import { spacing } from '../../../../theme';
import { useT } from '../../../../i18n';
import { optionsOf as optionsFor, visibleFilters } from '../constants';
import { CITIES } from '../filterCatalog';
import FilterPill from './FilterPill';
import LanguagePill from './LanguagePill';
import LocationSheet from './LocationSheet';

// The quick filters: one line of dropdown pills that scrolls sideways, after
// the language pill (LanguagePill). Tapping
// one opens its choices in a bottom sheet ("All" clears it); Location opens
// the state -> city sheet. A pill with a choice shows that choice in red.
// Picking Bike makes the rest fit bikes: car-only filters are hidden, the
// options are bike ones and the icons follow (see QUICK_FILTERS).
// filters: { [id]: value }; onChange(id, value | '').
// onLanguagePress(anchor): the language pill was tapped (Home shows the menu).
function QuickFilters({ filters, onChange, onLanguagePress, style }) {
  const t = useT();
  const [openId, setOpenId] = useState(null);
  const items = visibleFilters(filters);
  const open = items.find(item => item.id === openId);

  const optionLabel = option => option.label ?? t(option.labelKey);
  const optionsOf = item => optionsFor(item, filters);
  const iconOf = item => (typeof item.icon === 'function' ? item.icon(filters) : item.icon);

  // The chosen value's label (a city, an option, or a make / model name).
  const chosenLabel = item => {
    const value = filters[item.id];
    if (!value) {
      return null;
    }
    if (item.kind === 'location') {
      const city = CITIES.find(c => c.value === value);
      return city ? t(city.labelKey) : value;
    }
    const option = optionsOf(item).find(o => o.value === value);
    return option ? optionLabel(option) : value;
  };

  // The Model sheet names the make it lists ("Model - Maruti Suzuki").
  const sheetTitle = item =>
    item.id === 'model' && filters.make ? `${t(item.labelKey)} - ${filters.make}` : t(item.labelKey);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}
        style={style}
      >
        {/* The app language first, as the web's header picker. */}
        <LanguagePill onPress={onLanguagePress} />
        {items.map(item => {
          const chosen = chosenLabel(item);
          const name = t(item.labelKey);
          return (
            <FilterPill
              key={item.id}
              icon={iconOf(item)}
              label={chosen ?? name}
              active={!!chosen}
              accessibilityLabel={chosen ? `${name}: ${chosen}` : name}
              onPress={() => setOpenId(item.id)}
            />
          );
        })}
      </ScrollView>

      <LocationSheet
        visible={open?.kind === 'location'}
        value={filters.city}
        onSelect={value => onChange('city', value)}
        onClose={() => setOpenId(null)}
      />

      <OptionSheet
        visible={!!open && open.kind !== 'location'}
        title={open ? sheetTitle(open) : ''}
        options={
          open && open.kind !== 'location'
            ? [
                { label: t('home.filter.all'), value: '' },
                ...optionsOf(open).map(option => ({ label: optionLabel(option), value: option.value })),
              ]
            : []
        }
        value={open ? filters[open.id] ?? '' : ''}
        onSelect={value => onChange(open.id, value)}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});

export default QuickFilters;
