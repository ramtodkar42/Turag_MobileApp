import { useCallback, useEffect } from 'react';
import { ActivityIndicator, Animated, FlatList, StyleSheet } from 'react-native';
import {
  AppRefreshControl,
  FloatingAIButton,
  PinnedToBottom,
  ScreenContainer,
  useTabBarSpace,
  VehicleGridCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import useVehicleGrid from '../../../hooks/useVehicleGrid';
import { useUser } from '../../../store/userStore';
import { addRecentSearch } from '../../../store/recentSearchStore';
import useNotificationBadge from '../../../hooks/useNotificationBadge';
import useKeyboardVisible from '../../../hooks/useKeyboardVisible';
import usePulse from '../../../hooks/usePulse';
import { loadSaved } from '../../../store/savedStore';
import { ROUTES } from '../../../navigation/routes';
import HomeListHeader from './components/HomeListHeader';
import ListStatus from './components/ListStatus';
import useMarketplace from './useMarketplace';

// Marketplace home: header, search, filters, banner, categories + vehicle grid
// (2 columns on phones, 3 on tablets) from GET /marketplace/listings, with
// placeholders on first load and more vehicles loading as you scroll.
function Home({ navigation, route }) {
  const user = useUser();
  const market = useMarketplace();
  const tabBarSpace = useTabBarSpace();
  const keyboardOpen = useKeyboardVisible();
  const grid = useVehicleGrid();
  const { columns, cardWidth, gap } = grid;
  const { setQuery } = market;
  // Notifications load in the background (the bell page opens instantly) and
  // the bell's count stays fresh while Home is shown.
  const unreadCount = useNotificationBadge();

  // Saved vehicles too, so the hearts show what's already saved.
  useEffect(() => {
    loadSaved();
  }, []);

  // A recent search tapped on the Saved tab opens Home with that search.
  const incomingQuery = route?.params?.query;
  useEffect(() => {
    if (incomingQuery) {
      setQuery(incomingQuery);
      navigation.setParams({ query: undefined });
    }
  }, [incomingQuery, setQuery, navigation]);

  // Opened with { refresh } (e.g. "See Listing on Marketplace"): reload the grid.
  const refreshSignal = route?.params?.refresh;
  const { reload } = market;
  useEffect(() => {
    if (refreshSignal) {
      reload();
      navigation.setParams({ refresh: undefined });
    }
  }, [refreshSignal, reload, navigation]);

  // Keyboard "search" key: remember the search with its first result's photo.
  const onSubmitSearch = () =>
    addRecentSearch({ query: market.query, image: market.vehicles[0]?.image });

  // While a search runs, the cards on screen gently fade in and out, so it's
  // clear new results are coming (a new search then shows the grey cards).
  const cardOpacity = usePulse(market.searching);

  const renderItem = useCallback(
    ({ item }) => (
      <Animated.View style={{ opacity: cardOpacity }}>
        <VehicleGridCard
          vehicle={item}
          width={cardWidth}
          onPress={() => navigation.navigate(ROUTES.VEHICLE_LISTING, { vehicle: item })}
        />
      </Animated.View>
    ),
    [cardWidth, navigation, cardOpacity],
  );

  return (
    <ScreenContainer padded={false}>
      <FlatList
        key={columns}
        data={market.vehicles}
        numColumns={columns}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <HomeListHeader
            user={user}
            market={market}
            unreadCount={unreadCount}
            onSubmitSearch={onSubmitSearch}
            onNotificationsPress={() => navigation.navigate(ROUTES.NOTIFICATIONS)}
          />
        }
        ListEmptyComponent={<ListStatus market={market} grid={grid} onRetry={market.retry} />}
        ListFooterComponent={
          market.loadingMore ? <ActivityIndicator color={colors.primary} style={styles.more} /> : null
        }
        onEndReached={market.loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={9}
        removeClippedSubviews
        columnWrapperStyle={[styles.row, { gap, marginTop: gap }]}
        contentContainerStyle={{ paddingBottom: tabBarSpace }}
        refreshControl={
          <AppRefreshControl refreshing={market.refreshing} onRefresh={market.refresh} />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {/* Like the tab bar: stays put when the keyboard opens, hidden while typing. */}
      {/* Floats clearly ABOVE the tab bar (tab bar space + a comfortable gap). */}
      <PinnedToBottom offset={tabBarSpace + spacing.xl} hidden={keyboardOpen} style={styles.ai}>
        <FloatingAIButton onPress={() => navigation.navigate(ROUTES.CHAT_SPLASH)} />
      </PinnedToBottom>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
  },
  more: {
    paddingVertical: spacing.lg,
  },
  ai: {
    right: spacing.lg,
  },
});

export default Home;
