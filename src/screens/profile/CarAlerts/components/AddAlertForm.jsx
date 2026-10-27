import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  Chip,
  SelectField,
} from '../../../../components';
import { spacing } from '../../../../theme';
import { useT } from '../../../../i18n';
import { BODIES, BUDGETS, CITIES, FUELS, MAKES, lakhs } from '../constants';

// One "pick one, tap again to clear" row of chips with its label.
function ChipRow({ label, options, value, onChange }) {
  return (
    <View style={styles.group}>
      <AppText variant="label" style={styles.groupLabel}>
        {label}
      </AppText>
      <View style={styles.chips}>
        {options.map(o => (
          <Chip
            key={o.value}
            label={o.label}
            selected={value === o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
          />
        ))}
      </View>
    </View>
  );
}

// "Add an alert" (as the web): make, body type, fuel, city and budget - any
// left empty matches every car. At least one is needed.
// alerts: from useCarAlerts (form, setField, canAdd, addAlert, busy).
function AddAlertForm({ alerts, style }) {
  const t = useT();
  const { form, setField, canAdd, addAlert, busy } = alerts;

  return (
    <Card style={[styles.card, style]}>
      <AppText variant="title">{t('carAlerts.add.title')}</AppText>
      <AppText variant="caption" style={styles.intro}>
        {t('carAlerts.add.intro')}
      </AppText>

      <SelectField
        label={t('carAlerts.field.make')}
        placeholder={t('carAlerts.any.make')}
        value={form.make}
        options={MAKES.map(m => ({ label: m, value: m }))}
        onChange={setField('make')}
        style={styles.make}
      />
      <ChipRow
        label={t('carAlerts.field.body')}
        options={BODIES.map(v => ({
          value: v,
          label: t(`carAlerts.body.${v}`),
        }))}
        value={form.bodyType}
        onChange={setField('bodyType')}
      />
      <ChipRow
        label={t('carAlerts.field.fuel')}
        options={FUELS.map(v => ({
          value: v,
          label: t(`carAlerts.fuel.${v}`),
        }))}
        value={form.fuel}
        onChange={setField('fuel')}
      />
      <ChipRow
        label={t('carAlerts.field.city')}
        options={CITIES.map(v => ({
          value: v,
          label: t(`carAlerts.city.${v}`),
        }))}
        value={form.city}
        onChange={setField('city')}
      />
      <ChipRow
        label={t('carAlerts.field.budget')}
        options={BUDGETS.map(v => ({
          value: v,
          label: t('carAlerts.under', { amount: lakhs(v) }),
        }))}
        value={form.budget}
        onChange={setField('budget')}
      />

      <Button
        title={t('carAlerts.add.button')}
        loading={busy === 'add'}
        disabled={!canAdd || busy != null}
        onPress={addAlert}
        style={styles.button}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
  },
  intro: {
    marginTop: spacing.xs,
  },
  make: {
    marginTop: spacing.md,
  },
  group: {
    marginTop: spacing.md,
  },
  groupLabel: {
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    marginTop: spacing.lg,
  },
});

export default AddAlertForm;
