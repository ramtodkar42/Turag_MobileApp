import { memo } from 'react';
import { StyleSheet } from 'react-native';
import FavoriteButton from './FavoriteButton';
import TierBadge from './TierBadge';
import VehicleCard from './VehicleCard';
import { formatPriceShort } from '../../utils/format';
import { toggleSaved, useIsSaved } from '../../store/savedStore';
import { requireLogin } from '../../store/loginPromptStore';
import { useT } from '../../i18n';
import { codeLabel } from '../../i18n/vehicleLabels';

// Vehicle card for grids (Home, Saved) with the heart wired to the saved list
// (a guest is asked to log in first).
function VehicleGridCard({ vehicle, width, onPress }) {
  const t = useT();
  const saved = useIsSaved(vehicle.id);
  // Sold (a launch-preview listing) or reserved (an offer was accepted), as the web's card.
  let status = null;
  if (vehicle.sold) {
    status = { label: t('marketplace.sold'), tone: 'sold' };
  } else if (vehicle.reserved) {
    status = { label: t('marketplace.reserved'), tone: 'reserved' };
  }

  return (
    <VehicleCard
      image={vehicle.image}
      loading={vehicle.imagePending}
      title={vehicle.name}
      meta={[String(vehicle.year), codeLabel(t, 'marketplace.fuel', vehicle.fuelCode, vehicle.fuel)]}
      price={formatPriceShort(vehicle.price)}
      badge={vehicle.verified ? t('common.verified') : undefined}
      status={status}
      topRight={
        <FavoriteButton active={saved} onPress={() => requireLogin('save') && toggleSaved(vehicle)} />
      }
      bottomLeft={vehicle.tier ? <TierBadge tier={vehicle.tier} short /> : null}
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
