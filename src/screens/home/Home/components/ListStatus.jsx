import { StyleSheet } from 'react-native';
import { Button, StatusView, VehicleGridSkeleton } from '../../../../components';
import { spacing } from '../../../../theme';
import { useT } from '../../../../i18n';

// What Home shows instead of the grid when there are no cards to show:
// placeholders while loading, "Coming soon" (Commercial), an error with
// Try again, or an empty message. "All" just says what's there; a specific
// tab (Cars, Bikes) whose filters hide everything offers Clear filters.
// grid: useVehicleGrid() sizing, so the placeholders match the real cards.
function ListStatus({ market, grid, onRetry }) {
  const t = useT();
  if (market.comingSoon) {
    return (
      <StatusView
        title={t('home.comingSoon.title')}
        message={t('home.comingSoon.message')}
        style={styles.status}
      />
    );
  }
  if (market.loading) {
    return <VehicleGridSkeleton {...grid} />;
  }
  if (market.error) {
    return (
      <StatusView title={t('home.error.title')} message={market.error} style={styles.status}>
        <Button title={t('common.retry')} size="sm" onPress={onRetry} style={styles.action} />
      </StatusView>
    );
  }
  if (market.hasFilters && market.category !== 'all') {
    return (
      <StatusView
        title={t('home.filtered.title')}
        message={t('home.filtered.message')}
        style={styles.status}
      >
        <Button
          title={t('home.clearFilters')}
          size="sm"
          variant="outline"
          onPress={market.clearFilters}
          style={styles.action}
        />
      </StatusView>
    );
  }
  const searched = market.query.trim();
  return (
    <StatusView
      title={searched ? t('home.searched.title') : t('home.empty.title')}
      message={
        searched
          ? t('home.searched.message', { query: searched })
          : t('home.empty.message')
      }
      style={styles.status}
    />
  );
}

const styles = StyleSheet.create({
  status: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default ListStatus;
