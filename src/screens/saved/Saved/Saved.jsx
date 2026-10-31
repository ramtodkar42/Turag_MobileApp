import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppRefreshControl,
  AppText,
  Button,
  Icon,
  ScreenContainer,
  SearchBar,
  SectionHeader,
  StatusView,
  useTabBarSpace,
  VehicleGridCard,
  VehicleGridSkeleton,
} from '../../../components';
import { colors, shadows, spacing } from '../../../theme';
import { HIT_SLOP } from '../../../constants/layout';
import useVehicleGrid from '../../../hooks/useVehicleGrid';
import { fs, ms } from '../../../utils/responsive';
import { loadSaved, useSavedStatus, useSavedVehicles } from '../../../store/savedStore';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { filterSaved } from './savedSearch';

// The search box shows from this many saved vehicles (a short list needs none).
const SEARCH_FROM = 6;

// Saved tab: the vehicles hearted on Home (GET /saved-listings; refreshed
// quietly each time the tab opens), with a search over just those - it filters
// as you type (savedSearch.js). Home's search is the one for the marketplace
// (with its recent searches).
function Saved({ navigation }) {
  const t = useT();
  const saved = useSavedVehicles();
  const status = useSavedStatus();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const tabBarSpace = useTabBarSpace();
  const grid = useVehicleGrid();
  const { columns, cardWidth, gap } = grid;

  // Each visit: refresh the list; clear the search when leaving the tab.
  useFocusEffect(
    useCallback(() => {
      loadSaved();
      return () => setQuery('');
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSaved();
    setRefreshing(false);
  };

  const vehicles = useMemo(() => filterSaved(saved, query), [saved, query]);
  // Still shown while something is typed, so it can always be cleared.
  const showSearch = saved.length >= SEARCH_FROM || query !== '';

  const renderItem = useCallback(
    ({ item }) => (
      <VehicleGridCard
        vehicle={item}
        width={cardWidth}
        onPress={() => navigation.navigate(ROUTES.VEHICLE_LISTING, { vehicle: item })}
      />
    ),
    [cardWidth, navigation],
  );

  const header = (
    <View style={styles.header}>
      <AppText variant="h2" style={[styles.padded, styles.title]}>
        {t('saved.title')}
      </AppText>
      {showSearch ? (
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('saved.searchPlaceholder')}
          accessibilityLabel={t('saved.searchPlaceholder')}
          returnKeyType="done"
          autoCorrect={false}
          left={<Icon name="search" color={colors.body} />}
          right={
            query ? (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={t('common.filter.clearSearch')}
              >
                <Icon name="close" size={ms(18)} color={colors.body} />
              </Pressable>
            ) : null
          }
          style={[styles.padded, styles.search]}
        />
      ) : null}
      {saved.length > 0 ? (
        <SectionHeader
          title={t('saved.vehicles')}
          variant="h3"
          style={styles.padded}
          titleStyle={styles.sectionTitle}
        />
      ) : null}
    </View>
  );

  let empty;
  if (!status.loaded && status.loading) {
    empty = <VehicleGridSkeleton {...grid} />;
  } else if (!status.loaded && status.error) {
    empty = (
      <StatusView title={t('saved.loadError')} message={status.error} style={styles.empty}>
        <Button title={t('common.retry')} size="sm" onPress={loadSaved} style={styles.retry} />
      </StatusView>
    );
  } else if (saved.length === 0) {
    empty = (
      <StatusView
        title={t('saved.empty.title')}
        message={t('saved.empty.message')}
        style={styles.empty}
      />
    );
  } else {
    empty = (
      <StatusView
        message={t('saved.noMatch', { query: query.trim() })}
        style={styles.empty}
      />
    );
  }

  return (
    <ScreenContainer padded={false}>
      <FlatList
        key={columns}
        data={vehicles}
        numColumns={columns}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        columnWrapperStyle={[styles.row, { gap, marginTop: gap }]}
        contentContainerStyle={{ paddingBottom: tabBarSpace }}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  padded: {
    marginHorizontal: spacing.lg,
  },
  title: {
    fontSize: fs(24),
    lineHeight: fs(30),
  },
  sectionTitle: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  search: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  row: {
    paddingHorizontal: spacing.lg,
  },
  empty: {
    paddingVertical: spacing.xxl,
  },
  retry: {
    marginTop: spacing.lg,
  },
});

export default Saved;
