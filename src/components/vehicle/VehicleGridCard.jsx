import { memo } from 'react';
import { StyleSheet } from 'react-native';
import FavoriteButton from './FavoriteButton';
import VehicleCard from './VehicleCard';
import { formatPriceShort } from '../../utils/format';
import { toggleSaved, useIsSaved } from '../../store/savedStore';
import { useT } from '../../i18n';
import { codeLabel } from '../../i18n/vehicleLabels';

// Vehicle card for grids (Home, Saved) with the heart wired to the saved list.
function VehicleGridCard({ vehicle, width, onPress }) {
  const t = useT();
  const saved = useIsSaved(vehicle.id);

  return (
    <VehicleCard
      image={vehicle.image}
      loading={vehicle.imagePending}
      title={vehicle.name}
      meta={[String(vehicle.year), codeLabel(t, 'marketplace.fuel', vehicle.fuelCode, vehicle.fuel)]}
      price={formatPriceShort(vehicle.price)}
      badge={vehicle.verified ? t('common.verified') : undefined}
      topRight={<FavoriteButton active={saved} onPress={() => toggleSaved(vehicle)} />}
      onPress={onPress}
      style={[styles.card, { width }]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 0, // grid passes an exact width
  },
});

export default memo(VehicleGridCard);
