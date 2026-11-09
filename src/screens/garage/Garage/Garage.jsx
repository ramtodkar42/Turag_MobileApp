import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppRefreshControl,
  Button,
  CardListSkeleton,
  HeaderCard,
  ScreenContainer,
  StatusView,
  useTabBarSpace,
} from '../../../components';
import { spacing } from '../../../theme';
import { MAX_CONTENT_WIDTH } from '../../../constants/layout';
import { isTablet } from '../../../utils/responsive';
import { loadGarage, markOpenInspectionsSeen, useGarage, useGarageStatus } from '../../../store/garageStore';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { selfInspectionParams } from '../garagePhase';
import GarageCard from './components/GarageCard';

// One card a row on phones (as the web on a phone: everything on a card reads in
// full, its button included), two side by side on tablets.
const COLUMNS = isTablet ? 2 : 1;
const GAP = spacing.md;

// Garage tab: the user's saved vehicles (GET /saved-vehicles), refreshed
// quietly each time the tab opens; placeholders only on the first load.
function Garage({ navigation }) {
  const t = useT();
  const vehicles = useGarage();
  const status = useGarageStatus();
  const tabBarSpace = useTabBarSpace();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH) - spacing.lg * 2;
  const cardWidth = (contentWidth - GAP * (COLUMNS - 1)) / COLUMNS;

  useFocusEffect(
    useCallback(() => {
      loadGarage();
    }, []),
  );
  // Seen here: the open self-inspections on show no longer need the tab's dot
  // (also those that arrive while the Garage is open).
  useFocusEffect(
    useCallback(() => {
      markOpenInspectionsSeen(vehicles);
    }, [vehicles]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGarage();
    setRefreshing(false);
  };

  // The card's action (garagePhase.phaseAction): list it, open its listing,
  // continue / view the self-inspection, book an inspector, or open the vehicle
  // (where self-inspect / book an inspector live).
  const onAction = useCallback(
    (kind, vehicle) => {
      const valuation = vehicle.valuationId
        ? { valuationId: vehicle.valuationId, estimatedValue: vehicle.estimatedValue }
        : null;
      if (kind === 'list') {
        navigation.navigate(ROUTES.CREATE_LISTING, { vehicle });
      } else if (kind === 'view') {
        navigation.navigate(ROUTES.MY_LISTING, { listingId: vehicle.listingId });
      } else if (kind === 'resume' || kind === 'pay' || kind === 'summary') {
        navigation.navigate(ROUTES.SELF_INSPECTION, selfInspectionParams(vehicle));
      } else if (kind === 'book') {
        navigation.navigate(ROUTES.BOOK_APPOINTMENT, { vehicle, valuation });
      } else {
        navigation.navigate(ROUTES.GARAGE_VEHICLE, { vehicle });
      }
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <GarageCard
        vehicle={item}
        style={COLUMNS > 1 ? { width: cardWidth } : styles.single}
        onPress={() => navigation.navigate(ROUTES.GARAGE_VEHICLE, { vehicle: item })}
        onAction={onAction}
      />
    ),
    [cardWidth, navigation, onAction],
  );

  let empty;
  if (!status.loaded && status.loading) {
    empty = <CardListSkeleton cards={[3, 3, 3]} style={styles.skeleton} />;
  } else if (!status.loaded && status.error) {
    empty = (
      <StatusView title={t('garage.error.title')} message={status.error} style={styles.empty}>
        <Button title={t('common.retry')} size="sm" onPress={loadGarage} style={styles.emptyButton} />
      </StatusView>
    );
  } else {
    empty = (
      <StatusView
        title={t('garage.empty.title')}
        message={t('garage.empty.message')}
        style={styles.empty}
      >
        <Button
          title={t('garage.empty.evaluate')}
          size="md"
          onPress={() => navigation.navigate(ROUTES.EVALUATE_CHAT)}
          style={styles.emptyButton}
        />
      </StatusView>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={vehicles}
        numColumns={COLUMNS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <HeaderCard
            title={t('garage.title')}
            subtitle={t('garage.subtitle')}
            style={styles.header}
          />
        }
        ListEmptyComponent={empty}
        columnWrapperStyle={COLUMNS > 1 ? styles.row : undefined}
        contentContainerStyle={{ paddingBottom: tabBarSpace + spacing.md }}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={9}
        removeClippedSubviews
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  single: {
    marginTop: GAP,
    marginHorizontal: spacing.lg,
  },
  row: {
    gap: GAP,
    marginTop: GAP,
    paddingHorizontal: spacing.lg,
  },
  skeleton: {
    marginTop: GAP,
    marginHorizontal: spacing.lg,
  },
  empty: {
    paddingVertical: spacing.xxl,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
});

export default Garage;
