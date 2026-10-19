import { useCallback, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppRefreshControl,
  Button,
  HeaderCard,
  ScreenContainer,
  StatusView,
  useTabBarSpace,
  VehicleGridSkeleton,
} from '../../../components';
import { spacing } from '../../../theme';
import useVehicleGrid from '../../../hooks/useVehicleGrid';
import { loadGarage, useGarage, useGarageStatus } from '../../../store/garageStore';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import GarageCard from './components/GarageCard';

// Garage tab: the user's saved vehicles (GET /saved-vehicles), refreshed
// quietly each time the tab opens; placeholders only on the first load.
function Garage({ navigation }) {
  const t = useT();
  const vehicles = useGarage();
  const status = useGarageStatus();
  const tabBarSpace = useTabBarSpace();
  const grid = useVehicleGrid();
  const { columns, cardWidth, gap } = grid;
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadGarage();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGarage();
    setRefreshing(false);
  };

  // The card's action: list it, open its listing, open the vehicle to get it
  // inspected, or book an inspection.
  const onAction = useCallback(
    (kind, vehicle) => {
      if (kind === 'list') {
        navigation.navigate(ROUTES.CREATE_LISTING, { vehicle });
      } else if (kind === 'view') {
        navigation.navigate(ROUTES.MY_LISTING, { listingId: vehicle.listingId });
      } else if (kind === 'open') {
        // Not inspection-eligible yet: the detail page offers self-inspect / book.
        navigation.navigate(ROUTES.GARAGE_VEHICLE, { vehicle });
      } else {
        navigation.navigate(ROUTES.BOOK_APPOINTMENT, { vehicle });
      }
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <GarageCard
        vehicle={item}
        width={cardWidth}
        onPress={() => navigation.navigate(ROUTES.GARAGE_VEHICLE, { vehicle: item })}
        onAction={onAction}
      />
    ),
    [cardWidth, navigation, onAction],
  );

  let empty;
  if (!status.loaded && status.loading) {
    empty = <VehicleGridSkeleton {...grid} />;
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
        key={columns}
        data={vehicles}
        numColumns={columns}
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
        columnWrapperStyle={[styles.row, { gap, marginTop: gap }]}
        contentContainerStyle={{ paddingBottom: tabBarSpace }}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
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
  row: {
    paddingHorizontal: spacing.lg,
  },
  empty: {
    paddingVertical: spacing.xxl,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
});

export default Garage;
