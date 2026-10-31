import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, StyleSheet, View } from 'react-native';
import { ms } from '../../../utils/responsive';
import {
  AppRefreshControl,
  AI_BUTTON_GAP,
  FloatingAIButton,
  PinnedToBottom,
  ScreenContainer,
  useTabBarSpace,
  VehicleGridCard,
} from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import useVehicleGrid from '../../../hooks/useVehicleGrid';
import { useUser } from '../../../store/userStore';
import { addRecentSearch } from '../../../store/recentSearchStore';
import useNotificationBadge from '../../../hooks/useNotificationBadge';
import useKeyboardVisible from '../../../hooks/useKeyboardVisible';
import { loadSaved } from '../../../store/savedStore';
import { requireLogin } from '../../../store/loginPromptStore';
import { ROUTES } from '../../../navigation/routes';
import HomeListHeader from './components/HomeListHeader';
import LanguageMenu from './components/LanguageMenu';
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

  // Saved vehicles too, so the hearts show what's already saved (guests have
  // none; loads as soon as they log in).
  const signedIn = !!user;
  useEffect(() => {
    if (signedIn) {
      loadSaved();
    }
  }, [signedIn]);

  // A search (typed or recent) from the search screen opens Home with it.
  const incomingQuery = route?.params?.query;
  useEffect(() => {
    if (incomingQuery) {
      setQuery(incomingQuery);
      navigation.setParams({ query: undefined });
    }
  }, [incomingQuery, setQuery, navigation]);

  // A price range / brand picked on the search screen: that filter (instead of
  // a typed search).
  const incomingFilter = route?.params?.filter;
  const { setFilter } = market;
  useEffect(() => {
    if (incomingFilter) {
      setQuery('');
      setFilter(incomingFilter.id, incomingFilter.value, { inCategory: incomingFilter.category });
      navigation.setParams({ filter: undefined });
    }
  }, [incomingFilter, setFilter, setQuery, navigation]);

  // The search button opens the search screen (Home's tab picks its prices / brands).
  const openSearch = useCallback(
    () => navigation.navigate(ROUTES.SEARCH, { vehicle: market.filters.vehicle ?? null }),
    [navigation, market.filters.vehicle],
  );

  // Opened with { refresh } (e.g. "See Listing on Marketplace"): reload the grid.
  const refreshSignal = route?.params?.refresh;
  const { reload } = market;
  useEffect(() => {
    if (refreshSignal) {
      reload();
      navigation.setParams({ refresh: undefined });
    }
  }, [refreshSignal, reload, navigation]);

  // The language menu drops just below the language pill. Both are measured
  // inside this screen (one coordinate system), so it lines up on every phone.
  const screenRef = useRef(null);
  const [languageAt, setLanguageAt] = useState(null);
  const openLanguage = useCallback(anchor => {
    if (!anchor || !screenRef.current) return;
    anchor.measureLayout(
      screenRef.current,
      (x, y, _width, height) => setLanguageAt({ left: x, top: y + height + ms(8) }),
      () => {},
    );
  }, []);
  const closeLanguage = useCallback(() => setLanguageAt(null), []);

  // Keyboard "search" key: remember the search with its first result's photo.
  const onSubmitSearch = () =>
    addRecentSearch({ query: market.query, image: market.vehicles[0]?.image });

  // While new results are on their way, the cards on screen stay put under a
  // soft white veil that fades in once and out once (no blinking loop; the
  // cards themselves never fade, so their shadows don't flash on Android).
  const veil = useRef(new Animated.Value(0)).current;
  const busy = market.searching || market.updating;
  useEffect(() => {
    Animated.timing(veil, {
      toValue: busy ? 1 : 0,
      duration: busy ? 160 : 220,
      useNativeDriver: true,
    }).start();
  }, [busy, veil]);

  const renderItem = useCallback(
    ({ item }) => (
      <View>
        <VehicleGridCard
          vehicle={item}
          width={cardWidth}
          onPress={() => navigation.navigate(ROUTES.VEHICLE_LISTING, { vehicle: item })}
        />
        <Animated.View pointerEvents="none" style={[styles.veil, { opacity: veil }]} />
      </View>
    ),
    [cardWidth, navigation, veil],
  );

  return (
    <ScreenContainer padded={false}>
      <View ref={screenRef} collapsable={false} style={styles.screen}>
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
            onNotificationsPress={() =>
              requireLogin('notifications') && navigation.navigate(ROUTES.NOTIFICATIONS)
            }
            onLanguagePress={openLanguage}
            onOpenSearch={openSearch}
          />
        }
        onScrollBeginDrag={languageAt ? closeLanguage : undefined}
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
      <PinnedToBottom offset={tabBarSpace + AI_BUTTON_GAP} hidden={keyboardOpen} style={styles.ai}>
        <FloatingAIButton onPress={() => navigation.navigate(ROUTES.CHAT_SPLASH)} />
      </PinnedToBottom>

      <LanguageMenu at={languageAt} onClose={closeLanguage} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  veil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
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
