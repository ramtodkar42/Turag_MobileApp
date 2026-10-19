import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  ScreenContainer,
  SuccessSheet,
  TextField,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatNumber } from '../../../utils/format';
import { currentHomeRoute } from '../../../navigation/homeRoute';
import { useT } from '../../../i18n';
import VehicleGallery from '../components/VehicleGallery';
import useOfferForm from './useOfferForm';

const SUCCESS_DELAY = 1500;

// Make an offer: the vehicle's photos edge to edge (back / bookmark on them,
// as its page), then "Your Offer" - price (required) + message (optional).
// After sending, the "Successful!" sheet shows for SUCCESS_DELAY, then the
// app returns to the marketplace.
function MakeOffer({ navigation, route }) {
  const t = useT();
  const { vehicle } = route.params;
  const form = useOfferForm(vehicle.id);

  const backToMarket = () => navigation.navigate(currentHomeRoute());

  useEffect(() => {
    if (!form.sent) {
      return undefined;
    }
    const timer = setTimeout(() => navigation.navigate(currentHomeRoute()), SUCCESS_DELAY);
    return () => clearTimeout(timer);
  }, [form.sent, navigation]);

  return (
    <ScreenContainer
      scroll
      padded={false}
      safeTop={false}
      footer={
        <Button
          title={t('marketplace.offer.submit')}
          onPress={form.submit}
          disabled={!form.isValid}
          loading={form.submitting}
        />
      }
    >
      <VehicleGallery vehicle={vehicle} onBack={navigation.goBack} showTabs={false} />

      <View style={styles.body}>
        <AppText variant="title" style={styles.heading}>
          {t('marketplace.offer.heading')}
        </AppText>
        <View style={styles.fields}>
          <TextField
            label={t('marketplace.offer.price')}
            placeholder={t('marketplace.offer.pricePlaceholder')}
            value={formatNumber(form.price)}
            onChangeText={form.setPrice}
            valid={form.isValid}
            left={
              <AppText variant="body" color={colors.heading}>
                ₹
              </AppText>
            }
            keyboardType="number-pad"
            returnKeyType="done"
          />
          <TextField
            label={t('marketplace.offer.message')}
            optional
            placeholder={t('marketplace.offer.messagePlaceholder')}
            value={form.message}
            onChangeText={form.setMessage}
            maxLength={200}
          />
        </View>

        {form.error ? (
          <AppText variant="caption" color={colors.danger} style={styles.error}>
            {form.error}
          </AppText>
        ) : null}
      </View>

      <SuccessSheet
        visible={form.sent}
        onClose={backToMarket}
        message={t('marketplace.offer.sent')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  heading: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  fields: {
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  error: {
    marginTop: spacing.md,
  },
});

export default MakeOffer;
