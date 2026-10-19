import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import Icon from '../icons/Icon';
import SearchBar from '../common/SearchBar';
import { colors, radius, shadows, spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { HIT_SLOP } from '../../constants/layout';
import { useT } from '../../i18n';
import { searchPlaces } from '../../api/services/geocode.api';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 600; // also keeps within OpenStreetMap's 1 request / second

// Search a place by name (area, street, landmark); results drop down below.
// Picking one calls onSelect(place) - see geocode.api mapPlace.
function PlaceSearch({ onSelect, style }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = nothing to show
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(0);
  const picked = useRef(false);

  useEffect(() => {
    const text = query.trim();
    if (picked.current || text.length < MIN_CHARS) {
      picked.current = false;
      setResults(null);
      setLoading(false);
      return undefined;
    }
    const id = ++latest.current;
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const places = await searchPlaces(text);
        if (id === latest.current) {
          setResults(places);
        }
      } catch (e) {
        if (id === latest.current) {
          setResults(null);
          setError(e.message);
        }
      } finally {
        if (id === latest.current) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const choose = place => {
    picked.current = true;
    latest.current += 1; // ignore a search still on its way
    setQuery(place.title);
    setResults(null);
    setLoading(false);
    Keyboard.dismiss();
    onSelect(place);
  };

  const clear = () => {
    latest.current += 1;
    setQuery('');
    setResults(null);
    setError('');
    setLoading(false);
  };

  let right = null;
  if (loading) {
    right = <ActivityIndicator size="small" color={colors.primary} />;
  } else if (query) {
    right = (
      <Pressable onPress={clear} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel={t('common.clear')}>
        <Icon name="close" size={ms(16)} color={colors.placeholder} />
      </Pressable>
    );
  }

  return (
    <View style={style}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t('booking.address.searchPlaceholder')}
        left={<Icon name="search" size={ms(18)} color={colors.placeholder} />}
        right={right}
        autoCorrect={false}
        accessibilityLabel={t('booking.address.searchPlaceholder')}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.note}>
          {error}
        </AppText>
      ) : null}
      {results ? (
        <View style={styles.results}>
          {results.length === 0 ? (
            <AppText variant="caption" style={styles.empty}>
              {t('booking.address.searchEmpty')}
            </AppText>
          ) : (
            results.map((place, index) => (
              <Pressable
                key={`${place.lat},${place.lng}`}
                onPress={() => choose(place)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}
              >
                <Icon name="navigation" size={ms(16)} color={colors.primary} />
                <View style={styles.text}>
                  <AppText variant="label" color={colors.heading} numberOfLines={1}>
                    {place.title}
                  </AppText>
                  {place.subtitle ? (
                    <AppText variant="caption" numberOfLines={1}>
                      {place.subtitle}
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  results: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    flex: 1,
  },
  empty: {
    paddingVertical: spacing.md,
  },
  note: {
    marginTop: spacing.xs,
  },
});

export default PlaceSearch;
