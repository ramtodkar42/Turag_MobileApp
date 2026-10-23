import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChoiceChip, PlaceFinder, TextField } from '../../../../components';
import { spacing } from '../../../../theme';
import { useT } from '../../../../i18n';

const PLACES = ['home', 'office'];

// Where the vehicle will be (as the web's /book, plus search and current
// location): Home / Office, then search a place or use the phone's location,
// or tap the map to pin it - the address fields below fill in from that spot
// (and the city / area / state, sent with the booking); the user adds the
// building / flat and a landmark.
// form: useAddressForm(); location: useLocationFill().
function AddressFields({ form, geo, location, style }) {
  const t = useT();
  const buildingRef = useRef(null);
  const landmarkRef = useRef(null);
  const pincodeRef = useRef(null);

  const next = ref => ({
    returnKeyType: 'next',
    submitBehavior: 'submit',
    onSubmitEditing: () => ref.current?.focus(),
  });

  return (
    <View style={[styles.fields, style]}>
      {/* Home / Office */}
      <View style={styles.row} accessibilityRole="radiogroup">
        {PLACES.map(p => (
          <ChoiceChip
            key={p}
            label={t(`booking.place.${p}`)}
            selected={form.values.place === p}
            onPress={() => form.set('place')(p)}
            style={styles.flex}
          />
        ))}
      </View>

      {/* Find the spot */}
      <PlaceFinder geo={geo} location={location} hint={t('booking.address.pinHint')} />

      {/* The address (filled from the spot; the building / flat and landmark are typed) */}
      <TextField
        label={t('booking.address.address')}
        placeholder={t('booking.address.addressPlaceholder')}
        value={form.values.address}
        onChangeText={form.set('address')}
        valid={form.valid.address}
        autoCapitalize="words"
        {...next(buildingRef)}
      />
      <TextField
        ref={buildingRef}
        label={t('booking.address.building')}
        placeholder={t('booking.address.buildingPlaceholder')}
        value={form.values.building}
        onChangeText={form.set('building')}
        valid={form.valid.building}
        autoCapitalize="words"
        {...next(landmarkRef)}
      />
      <TextField
        ref={landmarkRef}
        label={t('booking.address.landmark')}
        placeholder={t('booking.address.landmarkPlaceholder')}
        value={form.values.landmark}
        onChangeText={form.set('landmark')}
        autoCapitalize="sentences"
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
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});

export default AddressFields;
