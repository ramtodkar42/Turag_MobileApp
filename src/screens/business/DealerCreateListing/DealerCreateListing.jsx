import { StyleSheet, View } from 'react-native';
import { AppText, Button, Header, InfoNote, ScreenContainer, SelectField, TextField } from '../../../components';
import { colors, spacing } from '../../../theme';
import { formatNumber } from '../../../utils/format';
import { isTablet } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import OrgSummary from '../components/OrgSummary';
import { CATEGORIES, CITIES, FUELS } from '../statuses';
import useDealerListingForm from './useDealerListingForm';

// List a vehicle for a dealer org (the web's dealer create form): the
// listing is created in review, then the user goes back to My listings,
// which reloads and shows it.
// params: { org }
function DealerCreateListing({ navigation, route }) {
  const t = useT();
  const { org } = route.params;
  const form = useDealerListingForm(org.id);
  const { values, set } = form;

  const onSubmit = async () => {
    const created = await form.submit();
    if (created) {
      navigation.goBack();
    }
  };

  // Two fields side by side on tablets; stacked on phones.
  const pair = (a, b) => (
    <View style={isTablet ? styles.pair : styles.stack}>
      <View style={isTablet ? styles.flex : null}>{a}</View>
      <View style={isTablet ? styles.flex : null}>{b}</View>
    </View>
  );

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} title={t('business.create.title')} />}
      footer={
        <Button title={t('business.create.submit')} loading={form.busy} onPress={onSubmit} />
      }
    >
      <OrgSummary org={org} style={styles.org} />
      <InfoNote style={styles.note}>{t('business.create.note')}</InfoNote>
      <View style={styles.fields}>
        {pair(
          <SelectField
            label={t('business.field.category')}
            value={values.category}
            options={CATEGORIES.map(v => ({ value: v, label: t(`business.category.${v}`) }))}
            onChange={v => set('category', v)}
          />,
          <SelectField
            label={t('business.field.fuel')}
            value={values.fuel}
            options={FUELS.map(v => ({ value: v, label: t(`business.fuel.${v}`) }))}
            onChange={v => set('fuel', v)}
          />,
        )}
        {pair(
          <TextField
            label={t('business.field.make')}
            value={values.make}
            onChangeText={v => set('make', v)}
            placeholder={t('business.create.makeHint')}
            maxLength={60}
            autoCapitalize="words"
          />,
          <TextField
            label={t('business.field.model')}
            value={values.model}
            onChangeText={v => set('model', v)}
            placeholder={t('business.create.modelHint')}
            maxLength={60}
            autoCapitalize="words"
          />,
        )}
        {pair(
          <TextField
            label={t('business.field.year')}
            value={values.year}
            onChangeText={v => set('year', v)}
            placeholder="2019"
            keyboardType="number-pad"
            maxLength={4}
          />,
          <TextField
            label={t('business.field.askPriceRupees')}
            value={formatNumber(values.askPrice)}
            onChangeText={v => set('askPrice', v)}
            placeholder="5,50,000"
            keyboardType="number-pad"
            maxLength={14}
          />,
        )}
        <SelectField
          label={t('business.field.city')}
          value={values.city}
          options={[
            { value: '', label: t('business.notSet') },
            ...CITIES.map(v => ({ value: v, label: t(`business.city.${v}`) })),
          ]}
          onChange={v => set('city', v)}
        />
      </View>
      {form.error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {form.error}
        </AppText>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  org: {
    marginTop: spacing.sm,
  },
  note: {
    marginTop: spacing.md,
  },
  fields: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  pair: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stack: {
    gap: spacing.md,
  },
  error: {
    marginTop: spacing.md,
  },
});

export default DealerCreateListing;
