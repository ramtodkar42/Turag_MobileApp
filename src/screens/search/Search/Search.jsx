import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Keyboard, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  BackButton,
  Icon,
  MicButton,
  ScreenContainer,
  SearchBar,
  TitledCard,
} from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { HIT_SLOP } from '../../../constants/layout';
import { ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import useVoiceSearch from '../../../hooks/useVoiceSearch';
import { addRecentSearch, clearRecentSearches, useRecentSearches } from '../../../store/recentSearchStore';
import { currentHomeRoute } from '../../../navigation/homeRoute';
import { ROUTES } from '../../../navigation/routes';
import { QUICK_FILTERS, optionsOf } from '../../home/Home/constants';
import { brandFits, popularBrands, suggestionsFor } from '../brands';
import BrandTile from './components/BrandTile';
import HighlightText from './components/HighlightText';

const PRICE = QUICK_FILTERS.find(f => f.id === 'price');
const COLUMNS = 3;
const MAX_BRANDS = 9; // three rows of three
const MAX_RECENT = 5;
// Wider screens (tablets, landscape): the search page stays this wide, centred,
// so the brand tiles and rows don't stretch across the whole screen.
const MAX_PAGE_WIDTH = 640;

// One tappable line (a recent search / a suggestion): icon, text, arrow.
// highlight: the typed words, shown in red inside the text (suggestions).
function Row({ icon, label, highlight, sublabel, onPress, divider, right, a11y }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => [styles.row, divider && styles.rowDivider, pressed && styles.pressed]}
    >
      {icon}
      <View style={styles.flex}>
        {highlight ? (
          <HighlightText text={label} query={highlight} />
        ) : (
          <AppText variant="subtitle" color={colors.heading} numberOfLines={1}>
            {label}
          </AppText>
        )}
        {sublabel ? <AppText variant="caption">{sublabel}</AppText> : null}
      </View>
      {right ?? <Icon name="arrowUpRight" size={ms(17)} color={colors.placeholder} />}
    </Pressable>
  );
}

// The search screen opened from Home's search button (as car apps do), built
// from the app's own pieces (back button, pill search bar, cards): a search
// box ready to type in (with the mic), then
//   - nothing typed: recent searches, price ranges and 9 popular brands (logos)
//   - typing: matching brands / "brand model" suggestions
// Every choice goes back to Home with it applied: a search as Home's search
// (and remembered), a price as the Price filter, a brand as the Make filter.
// params: { query?, vehicle? ('cars' | 'bikes' - Home's tab, for prices / suggestions) }
function Search({ navigation, route }) {
  const t = useT();
  const { query: initial = '', vehicle } = route.params ?? {};
  const [text, setText] = useState(initial);
  const inputRef = useRef(null);
  const recent = useRecentSearches();
  const { confirm, dialog } = useConfirmDialog();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Back to Home with the choice applied there.
  const applyOnHome = useCallback(
    params => {
      Keyboard.dismiss();
      navigation.popTo(currentHomeRoute(), { screen: ROUTES.MARKET, params }, { merge: true });
    },
    [navigation],
  );

  const runSearch = useCallback(
    value => {
      const query = value.trim();
      if (!query) return;
      addRecentSearch({ query });
      applyOnHome({ query, searchAt: Date.now() });
    },
    [applyOnHome],
  );
  // A brand / price: remembered too (it shows in Recent searches and re-applies
  // the same filter), then applied on Home.
  // A brand that isn't on Home's tab (e.g. Hyundai while Bikes is open) shows
  // on All, so it's never silently dropped.
  const applyFilter = (id, value, labelKey = null) => {
    const category = id === 'make' && !brandFits(value, vehicle) ? 'all' : undefined;
    const filter = category ? { id, value, category } : { id, value };
    addRecentSearch({ query: labelKey ? t(labelKey) : value, filter, labelKey });
    applyOnHome({ filter, searchAt: Date.now() });
  };
  const runRecent = item => (item.filter ? applyFilter(item.filter.id, item.filter.value, item.labelKey) : runSearch(item.query));
  const recentLabel = item => (item.labelKey ? t(item.labelKey) : item.query);

  // Voice: the words fill the box as you speak; the final text searches.
  const voice = useVoiceSearch({ onPartial: setText, onResult: runSearch });
  const toggleVoice = () => {
    Keyboard.dismiss();
    voice.toggle();
  };

  const typing = text.trim() !== '';
  const suggestions = useMemo(() => suggestionsFor(text, vehicle), [text, vehicle]);
  const prices = optionsOf(PRICE, { vehicle });
  const brands = useMemo(() => popularBrands().slice(0, MAX_BRANDS), []);
  // Three tiles a row inside the card (screen + card padding, the gaps between).
  // On tablets / landscape the page is kept to a readable width, centred.
  const pageWidth = Math.min(width, MAX_PAGE_WIDTH);
  const tileWidth = (pageWidth - spacing.lg * 4 - spacing.md * (COLUMNS - 1)) / COLUMNS;

  const onClearRecent = () =>
    confirm({
      title: t('search.recent.clearTitle'),
      message: t('search.recent.clearMessage'),
      confirmLabel: t('search.recent.clearButton'),
      cancelLabel: t('common.cancel'),
      onConfirm: clearRecentSearches,
    });

  const header = (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <BackButton onPress={navigation.goBack} />
        <SearchBar
          ref={inputRef}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => runSearch(text)}
          placeholder={voice.listening ? t('home.voice.listening') : t('search.placeholder')}
          left={<Icon name="search" size={ms(18)} color={colors.body} />}
          right={
            <View style={styles.barRight}>
              {typing ? (
                <Pressable
                  onPress={() => {
                    setText('');
                    inputRef.current?.focus();
                  }}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.filter.clearSearch')}
                >
                  <Icon name="close" size={ms(18)} color={colors.body} />
                </Pressable>
              ) : null}
              {voice.available ? (
                <MicButton
                  listening={voice.listening}
                  level={voice.level}
                  onPress={toggleVoice}
                  accessibilityLabel={t(voice.listening ? 'home.voice.stop' : 'home.voice.start')}
                />
              ) : null}
            </View>
          }
          autoFocus
          autoCorrect={false}
          accessibilityLabel={t('search.placeholder')}
          style={styles.bar}
        />
      </View>
      {voice.hintKey ? (
        <AppText variant="caption" color={colors.primary} style={styles.hint}>
          {t(voice.hintKey)}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <ScreenContainer padded={false} header={header}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }]}
      >
        {typing ? (
          <View>
            <TitledCard title={t('search.suggestions')}>
              <View style={styles.cardBody}>
                {/* The words as typed, always first. */}
                <Row
                  icon={
                    <View style={styles.iconSpot}>
                      <Icon name="search" size={ms(17)} color={colors.primary} />
                    </View>
                  }
                  label={t('search.searchFor', { query: text.trim() })}
                  highlight={text}
                  onPress={() => runSearch(text)}
                  right={<Icon name="arrowUpRight" size={ms(17)} color={colors.primary} />}
                />
                {suggestions.map(s => (
                  <Row
                    key={s.label}
                    divider
                    icon={
                      <View style={[styles.iconSpot, styles.logoSpot]}>
                        {s.logo ? (
                          <Image source={s.logo} resizeMode="contain" style={styles.rowLogo} />
                        ) : (
                          <Icon name="carFront" size={ms(17)} color={colors.body} />
                        )}
                      </View>
                    }
                    label={s.label}
                    highlight={text}
                    sublabel={s.kind === 'brand' ? t('search.allOfBrand', { brand: s.label }) : null}
                    onPress={() => (s.kind === 'brand' ? applyFilter('make', s.make) : runSearch(s.label))}
                  />
                ))}
                {suggestions.length === 0 ? (
                  <AppText variant="caption" style={styles.note}>
                    {t('search.noSuggestions')}
                  </AppText>
                ) : null}
              </View>
            </TitledCard>
          </View>
        ) : (
          <View style={styles.sections}>
            {/* Only once something was searched. */}
            {recent.length ? (
              <TitledCard
                title={t('search.recent.title')}
                right={
                  <Pressable
                    onPress={onClearRecent}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={t('search.recent.clear')}
                  >
                    <Icon name="trash" size={ms(18)} color={colors.placeholder} />
                  </Pressable>
                }
              >
                <View style={styles.cardBody}>
                  {recent.slice(0, MAX_RECENT).map((item, i) => {
                    const label = recentLabel(item);
                    return (
                      <Row
                        key={`${item.filter?.id ?? 'q'}:${item.query}`}
                        divider={i > 0}
                        icon={<Icon name="history" size={ms(19)} color={colors.body} />}
                        label={label}
                        a11y={t('saved.recent.a11y', { query: label })}
                        onPress={() => runRecent(item)}
                        right={
                          item.filter ? undefined : (
                            // A typed search: put it back in the box to change it.
                            <Pressable
                              onPress={() => {
                                setText(item.query);
                                inputRef.current?.focus();
                              }}
                              hitSlop={HIT_SLOP}
                              accessibilityRole="button"
                              accessibilityLabel={t('search.recent.edit', { query: item.query })}
                            >
                              <Icon name="arrowUpRight" size={ms(18)} color={colors.primary} />
                            </Pressable>
                          )
                        }
                      />
                    );
                  })}
                </View>
              </TitledCard>
            ) : null}

            <TitledCard title={t('search.priceRange')}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.chips}
                style={styles.cardBody}
              >
                {prices.map(p => (
                  <Pressable
                    key={p.value}
                    onPress={() => applyFilter('price', p.value, p.labelKey)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                  >
                    <AppText variant="label" color={colors.heading}>
                      {t(p.labelKey)}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </TitledCard>

            <TitledCard title={t('search.brands')}>
              <View style={[styles.cardBody, styles.grid]}>
                {brands.map(brand => (
                  <BrandTile key={brand.name} brand={brand} width={tileWidth} onPress={name => applyFilter('make', name)} />
                ))}
              </View>
            </TitledCard>
          </View>
        )}
      </ScrollView>
      {dialog}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    maxWidth: MAX_PAGE_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bar: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  barRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hint: {
    marginTop: spacing.xs,
    marginLeft: ms(52),
  },
  content: {
    width: '100%',
    maxWidth: MAX_PAGE_WIDTH,
    alignSelf: 'center',
    padding: spacing.lg,
  },
  sections: {
    gap: spacing.lg,
  },
  cardBody: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: ms(50),
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  flex: {
    flex: 1,
  },
  iconSpot: {
    width: ms(36),
    height: ms(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  logoSpot: {
    backgroundColor: colors.input,
    padding: ms(5),
  },
  rowLogo: {
    width: '100%',
    height: '100%',
  },
  note: {
    marginTop: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  chip: {
    minHeight: ms(38),
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipPressed: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.lg,
  },
});

export default Search;
