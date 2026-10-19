import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  AppText,
  BackButton,
  BottomSheet,
  Button,
  CheckCircle,
  Icon,
  IconTile,
  SearchBar,
} from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { translate, useT } from '../../../../i18n';
import { CITIES, LIVE_STATE, STATES } from '../filterCatalog';

// One row of the sheet (same look as OptionSheet's): a label, and a check when
// chosen or an arrow when it opens a next step.
function Row({ label, selected, next, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={next ? 'button' : 'radio'}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}
    >
      <AppText variant="body" color={colors.heading} numberOfLines={1} style={styles.rowText}>
        {label}
      </AppText>
      {selected ? <CheckCircle size={ms(20)} /> : null}
      {next && !selected ? <Icon name="chevronRight" size={ms(16)} color={colors.placeholder} /> : null}
    </Pressable>
  );
}

// Location filter in two steps: the state (with a search box), then its city.
// Only Maharashtra is live (Pune, PCMC); any other state says we're coming
// there soon. value: the chosen city code ('PUNE' | 'PCMC') or none;
// onSelect(city | '').
function LocationSheet({ visible, value, onSelect, onClose }) {
  const t = useT();
  // null = the state list; otherwise the state being looked at.
  const [state, setState] = useState(null);
  const [query, setQuery] = useState('');

  // Opening with a city chosen goes straight to that state's cities.
  useEffect(() => {
    if (visible) {
      setState(value ? LIVE_STATE : null);
      setQuery('');
    }
  }, [visible, value]);

  const stateName = code => t(`location.state.${code}`);
  // Matches the name in the app's language or in English ("maha" finds
  // महाराष्ट्र too), anywhere in the name.
  const search = query.trim().toLowerCase();
  const states = search
    ? STATES.filter(code =>
        [stateName(code), translate('en', `location.state.${code}`)].some(name =>
          name.toLowerCase().includes(search),
        ),
      )
    : STATES;
  const pick = city => {
    onSelect(city);
    onClose();
  };
  // Back to the full state list (a fresh search).
  const backToStates = () => {
    setState(null);
    setQuery('');
  };

  let title;
  let body;
  if (!state) {
    title = t('location.chooseState');
    body = (
      <>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('location.searchState')}
          left={<Icon name="search" size={ms(18)} color={colors.body} />}
          right={
            query ? (
              <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={t('location.clearSearch')}>
                <Icon name="close" size={ms(16)} color={colors.body} />
              </Pressable>
            ) : null
          }
          autoCorrect={false}
          style={styles.search}
        />
        {/* Taps on a result work on the first tap, with the keyboard still open. */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.list}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {!search ? <Row label={t('location.all')} selected={!value} onPress={() => pick('')} /> : null}
          {states.map(code => (
            <Row key={code} label={stateName(code)} next onPress={() => setState(code)} />
          ))}
          {search && states.length === 0 ? (
            <AppText variant="subtitle" align="center" style={styles.noMatch}>
              {t('location.noState')}
            </AppText>
          ) : null}
        </ScrollView>
      </>
    );
  } else if (state === LIVE_STATE) {
    title = stateName(state);
    body = (
      <View style={styles.list}>
        <Row label={t('location.allIn', { state: stateName(state) })} selected={!value} onPress={() => pick('')} />
        {CITIES.map(city => (
          <Row key={city.value} label={t(city.labelKey)} selected={value === city.value} onPress={() => pick(city.value)} />
        ))}
      </View>
    );
  } else {
    title = stateName(state);
    body = (
      <View style={styles.soon}>
        <IconTile name="mapPin" size={ms(56)} />
        <AppText variant="title" align="center">
          {t('location.soonTitle', { state: stateName(state) })}
        </AppText>
        <AppText variant="subtitle" align="center">
          {t('location.soonText', { state: stateName(LIVE_STATE) })}
        </AppText>
        <Button title={t('location.otherState')} variant="outline" onPress={backToStates} style={styles.soonButton} />
      </View>
    );
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        {state ? <BackButton onPress={backToStates} /> : null}
        <AppText variant="title" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
      </View>
      {body}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
  },
  search: {
    marginBottom: spacing.md,
  },
  scroll: {
    maxHeight: ms(400),
  },
  noMatch: {
    paddingVertical: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: ms(48),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  rowSelected: {
    borderColor: colors.success,
  },
  rowText: {
    flex: 1,
  },
  pressed: {
    backgroundColor: colors.input,
  },
  soon: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  soonButton: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});

export default LocationSheet;
