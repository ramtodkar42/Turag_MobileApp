import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, PlaceFinder, TextField, TitledCard } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { useT } from '../../../../i18n';

// "Where is the vehicle?" (as the web's listing form): find the spot on the
// map (search / current location / tap) - the city and state fill in from it
// and can be corrected; the address, building, landmark and pincode are
// optional and stay private (buyers see the area and city only).
// form: useListingLocation(); showErrors: after a create attempt without a city / state.
function LocationSection({ form, showErrors, style }) {
  const t = useT();
  const stateRef = useRef(null);
  const addressRef = useRef(null);
  const buildingRef = useRef(null);
  const landmarkRef = useRef(null);
  const pincodeRef = useRef(null);
  const { values } = form;

  const next = ref => ({
    returnKeyType: 'next',
    submitBehavior: 'submit',
    onSubmitEditing: () => ref.current?.focus(),
  });
  const required = value => (showErrors && !value.trim() ? t('selling.create.location.required') : '');

  return (
    <TitledCard title={t('selling.create.location.title')} style={style}>
      <AppText variant="caption" style={styles.hint}>
        {t('selling.create.location.hint')}
      </AppText>
      <View style={styles.fields}>
        <PlaceFinder geo={form.geo} location={form.location} hint={t('selling.create.location.pinHint')} />

        <View style={styles.row}>
          <TextField
            label={t('selling.create.location.city')}
            placeholder={t('selling.create.location.cityPlaceholder')}
            value={values.city}
            onChangeText={form.set('city')}
            valid={values.city.trim() !== ''}
            error={required(values.city)}
            autoCapitalize="words"
            style={styles.flex}
            {...next(stateRef)}
          />
          <TextField
            ref={stateRef}
            label={t('selling.create.location.state')}
            placeholder={t('selling.create.location.statePlaceholder')}
            value={values.state}
            onChangeText={form.set('state')}
            valid={values.state.trim() !== ''}
            error={required(values.state)}
            autoCapitalize="words"
            style={styles.flex}
            {...next(addressRef)}
          />
        </View>

        <TextField
          ref={addressRef}
          label={t('booking.address.address')}
          optional
          placeholder={t('booking.address.addressPlaceholder')}
          value={values.address}
          onChangeText={form.set('address')}
          autoCapitalize="words"
          {...next(buildingRef)}
        />
        <TextField
          ref={buildingRef}
          label={t('booking.address.building')}
          optional
          placeholder={t('booking.address.buildingPlaceholder')}
          value={values.building}
          onChangeText={form.set('building')}
          autoCapitalize="words"
          {...next(landmarkRef)}
        />
        <TextField
          ref={landmarkRef}
          label={t('booking.address.landmark')}
          optional
          placeholder={t('booking.address.landmarkPlaceholder')}
          value={values.landmark}
          onChangeText={form.set('landmark')}
          autoCapitalize="sentences"
          {...next(pincodeRef)}
        />
        <TextField
          ref={pincodeRef}
          label={t('booking.address.pincode')}
          optional
          placeholder={t('booking.address.pincodePlaceholder')}
          value={values.pincode}
          onChangeText={form.setPincode}
          keyboardType="number-pad"
          maxLength={6}
          returnKeyType="done"
        />
        <AppText variant="caption" color={colors.body}>
          {t('selling.create.location.privacy')}
        </AppText>
      </View>
    </TitledCard>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: spacing.xxs,
  },
  fields: {
    marginTop: spacing.md,
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

export default LocationSection;
