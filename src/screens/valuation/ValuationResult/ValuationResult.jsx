import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  AppText,
  Button,
  Header,
  InfoNote,
  ScreenContainer,
  SuccessSheet,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { saveToGarage, useIsInGarage } from '../../../store/garageStore';
import { ROUTES } from '../../../navigation/routes';
import { currentHomeRoute } from '../../../navigation/homeRoute';
import { useT } from '../../../i18n';
import EstimateSummary from '../components/EstimateSummary';

const SUCCESS_DELAY = 2000;

// Valuation step: after a self-inspection, "sent for review" for 2 seconds;
// then the estimated value and price bands with "Save Vehicle" (adds it to
// the Garage; "View in Garage" when it was saved earlier - the backend
// returns the existing entry, now with the inspection's status).
// params: { vehicle, valuation (may be null when no estimate yet), inspected }
function ValuationResult({ navigation, route }) {
  const t = useT();
  const { vehicle, valuation, inspected = false } = route.params;
  const [showSuccess, setShowSuccess] = useState(inspected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const hasValue = valuation?.estimatedValue != null;
  // Saved earlier (on the verification step): saving again just opens it.
  const alreadySaved = useIsInGarage(vehicle.vehicleId);

  useEffect(() => {
    if (!inspected) {
      return undefined;
    }
    const timer = setTimeout(() => setShowSuccess(false), SUCCESS_DELAY);
    return () => clearTimeout(timer);
  }, [inspected]);

  const onSave = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await saveToGarage({ vehicle, valuation, inspected });
      // History becomes Garage tab -> this vehicle, so back goes to the Garage.
      navigation.reset({
        index: 1,
        routes: [
          { name: currentHomeRoute(), params: { screen: ROUTES.GARAGE } },
          { name: ROUTES.GARAGE_VEHICLE, params: { vehicle: saved } },
        ],
      });
    } catch (e) {
      setError(e.message || t('valuation.result.saveError'));
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} />}
      footer={
        <Button
          title={alreadySaved ? t('valuation.save.viewGarage') : t('valuation.result.save')}
          onPress={onSave}
          loading={saving}
        />
      }
    >
      <EstimateSummary
        vehicle={vehicle}
        valuation={valuation}
        description={hasValue ? t('valuation.result.description') : t('valuation.result.noValueNote')}
        style={styles.card}
      />

      {inspected ? (
        <InfoNote style={styles.card}>{t('valuation.result.reviewNote')}</InfoNote>
      ) : null}

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.card}>
          {error}
        </AppText>
      ) : null}

      <SuccessSheet
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
        message={t('valuation.result.submitted')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
  },
});

export default ValuationResult;
