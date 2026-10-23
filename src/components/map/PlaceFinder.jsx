import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import Icon from '../icons/Icon';
import CurrentLocationButton from './CurrentLocationButton';
import LocationPicker from './LocationPicker';
import PlaceSearch from './PlaceSearch';
import { colors, spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

const TONE_COLORS = { error: colors.danger, warning: colors.warning };

// Find a spot: search a place, use the phone's location, or tap the map to pin
// it - then one status line (finding the address / the place found / an error /
// a hint). Used where an address or a location is entered (booking, listing).
// geo: the pinned { lat, lng } | null; location: useLocationFill().
// hint: the line shown before anything is pinned.
function PlaceFinder({ geo, location, hint, style }) {
  const t = useT();

  let status;
  if (location.busy === 'address') {
    status = (
      <View style={styles.statusRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <AppText variant="caption">{t('booking.address.findingAddress')}</AppText>
      </View>
    );
  } else if (location.message) {
    status = (
      <AppText variant="caption" color={TONE_COLORS[location.message.tone]} accessibilityLiveRegion="polite">
        {location.message.text}
      </AppText>
    );
  } else if (location.place) {
    status = (
      <View style={styles.statusRow}>
        <Icon name="navigation" size={ms(14)} color={colors.success} />
        <AppText variant="caption" color={colors.body} style={styles.flex} numberOfLines={2}>
          {[location.place.title, location.place.subtitle].filter(Boolean).join(', ')}
        </AppText>
      </View>
    );
  } else if (geo) {
    status = (
      <AppText variant="caption">
        {t('booking.address.location', { lat: geo.lat.toFixed(5), lng: geo.lng.toFixed(5) })}
      </AppText>
    );
  } else {
    status = <AppText variant="caption">{hint}</AppText>;
  }

  return (
    <View style={[styles.wrap, style]}>
      <PlaceSearch onSelect={location.choosePlace} />
      <LocationPicker value={geo} onChange={location.pinAt}>
        <CurrentLocationButton onPress={location.useCurrent} loading={location.busy === 'current'} />
      </LocationPicker>
      <View style={styles.status}>{status}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  status: {
    marginTop: -spacing.xs,
    minHeight: ms(18),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flex: {
    flex: 1,
  },
});

export default PlaceFinder;
