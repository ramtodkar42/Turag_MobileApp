import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
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
import useVehicleGrid from '../../../hooks/useVehicleGrid';
import { fs } from '../../../utils/responsive';
import { loadSaved, useSavedStatus, useSavedVehicles } from '../../../store/savedStore';
import {
  addRecentSearch,
  clearRecentSearches,
  useRecentSearches,
} from '../../../store/recentSearchStore';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import RecentSearches from './components/RecentSearches';

// Saved tab: search, recent searches, and the vehicles hearted on Home
// (GET /saved-listings; refreshed quietly each time the tab opens).
function Saved({ navigation }) {
  const t = useT();
  const saved = useSavedVehicles();
  const status = useSavedStatus();
  const recent = useRecentSearches();
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

  const search = query.trim().toLowerCase();
  const vehicles = useMemo(
    () => (search ? saved.filter(v => v.name.toLowerCase().includes(search)) : saved),
    [saved, search],
  );

  const onSubmitSearch = () => addRecentSearch({ query, image: vehicles[0]?.image });

  // A recent search runs on the marketplace (Home), where all vehicles are: the
  // text again, or the brand / price filter it was.
  const openRecent = useCallback(
    item =>
      navigation.navigate(ROUTES.MARKET, item.filter ? { filter: item.filter } : { query: item.query }),
    [navigation],
  );

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
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={onSubmitSearch}
        placeholder={t('saved.searchPlaceholder')}
        left={<Icon name="search" color={colors.body} />}
        style={[styles.padded, styles.search]}
      />
      <RecentSearches items={recent} onSelect={openRecent} onClear={clearRecentSearches} />
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
