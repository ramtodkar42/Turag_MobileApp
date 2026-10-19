import { useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  AppText,
  CurrentLocationButton,
  Icon,
  LocationPicker,
  PlaceSearch,
  TextField,
} from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const TONE_COLORS = { error: colors.danger, warning: colors.warning };

// Where the vehicle will be (as the web's /book, plus search and current
// location): search a place or use the phone's location, or tap the map to
// pin it - the address fields below fill in from that spot; the user adds the
// flat / house number. form: useAddressForm(); location: useLocationFill().
function AddressFields({ form, geo, location, style }) {
  const t = useT();
  const areaRef = useRef(null);
  const pincodeRef = useRef(null);

  const next = ref => ({
    returnKeyType: 'next',
    submitBehavior: 'submit',
    onSubmitEditing: () => ref.current?.focus(),
  });

  let status = null;
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
  }

  return (
    <View style={[styles.fields, style]}>
      {/* Find the spot */}
      <PlaceSearch onSelect={location.choosePlace} />
      <LocationPicker value={geo} onChange={location.pinAt}>
        <CurrentLocationButton onPress={location.useCurrent} loading={location.busy === 'current'} />
      </LocationPicker>
      <View style={styles.status}>
        {status ?? <AppText variant="caption">{t('booking.address.pinHint')}</AppText>}
      </View>

      {/* The address (filled from the spot; the flat / house number is typed) */}
      <TextField
        label={t('booking.address.line1')}
        placeholder={t('booking.address.line1Placeholder')}
        value={form.values.line1}
        onChangeText={form.set('line1')}
        valid={form.valid.line1}
        autoCapitalize="words"
        {...next(areaRef)}
      />
      <TextField
        ref={areaRef}
        label={t('booking.address.area')}
        placeholder={t('booking.address.areaPlaceholder')}
        value={form.values.area}
        onChangeText={form.set('area')}
        valid={form.valid.area}
        autoCapitalize="words"
        {...next(pincodeRef)}
      />
      <TextField
        ref={pincodeRef}
        label={t('booking.address.pincode')}
        placeholder={t('booking.address.pincodePlaceholder')}
        value={form.values.pincode}
        onChangeText={form.setPincode}
        valid={form.valid.pincode}
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="done"
      />
      <AppText variant="caption">{t('booking.address.cityNote')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
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

export default AddressFields;
