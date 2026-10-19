import { useState } from 'react';
import { Button, Icon } from '../../../components';
import { colors } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { saveToGarage, useIsInGarage } from '../../../store/garageStore';
import { ROUTES } from '../../../navigation/routes';
import { currentHomeRoute } from '../../../navigation/homeRoute';
import { useT } from '../../../i18n';

// "Save Vehicle" (as on the web's result): adds the evaluated vehicle and its
// estimate to the Garage. Once saved it becomes "View in Garage".
// Saving again is safe - the backend returns the existing entry.
// onError(message) reports a failed save (the screen shows it).
function SaveVehicleButton({ navigation, vehicle, valuation, onError, style }) {
  const t = useT();
  const saved = useIsInGarage(vehicle.vehicleId);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    onError?.('');
    try {
      await saveToGarage({ vehicle, valuation });
    } catch (e) {
      onError?.(e.message || t('valuation.result.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Button
        title={t('valuation.save.viewGarage')}
        variant="outline"
        leftIcon={<Icon name="check" size={ms(16)} color={colors.primary} strokeWidth={2.5} />}
        onPress={() => navigation.navigate(currentHomeRoute(), { screen: ROUTES.GARAGE })}
        style={style}
      />
    );
  }
  return (
    <Button
      title={t('valuation.result.save')}
      variant="outline"
      onPress={onSave}
      loading={saving}
      style={style}
    />
  );
}

export default SaveVehicleButton;
