import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  CheckRow,
  ChoiceChip,
  Header,
  HeaderCard,
  Icon,
  ScreenContainer,
  StatusView,
  TextField,
  TitledCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import { EMPLOYMENT_TYPES, LOAN_TENURES } from '../../../api/services/loan.api';
import useLoanForm from './useLoanForm';

// Apply for a loan to finance the vehicle (the web's "Apply for a loan" on an
// accepted offer): a few details and Turag's team reaches out. Aadhaar is never
// asked here (that's done later through the licensed partner).
// params: { listingId, orderId, vehicleLabel, vehiclePrice (₹) }
function LoanApplication({ navigation, route }) {
  const t = useT();
  const context = route.params ?? {};
  const form = useLoanForm(context);
  const refs = { down: useRef(null), name: useRef(null), email: useRef(null), city: useRef(null), pan: useRef(null), income: useRef(null) };
  const next = ref => ({ returnKeyType: 'next', submitBehavior: 'submit', onSubmitEditing: () => ref.current?.focus() });

  if (form.done) {
    return (
      <ScreenContainer header={<Header onBack={navigation.goBack} />}>
        <StatusView
          icon={<Icon name="check" size={ms(34)} color={colors.success} strokeWidth={2.6} />}
          title={t('loan.done.title')}
          message={t(context.vehicleLabel ? 'loan.done.messageVehicle' : 'loan.done.message', {
            vehicle: context.vehicleLabel,
          })}
        >
          <Button title={t('loan.done.button')} onPress={navigation.goBack} style={styles.doneButton} />
        </StatusView>
      </ScreenContainer>
    );
  }

  const { values } = form;
  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} />}
      footer={
        <View style={styles.footer}>
          {form.error ? (
            <AppText variant="caption" color={colors.danger} align="center" accessibilityLiveRegion="polite">
              {form.error}
            </AppText>
          ) : null}
          <Button
            title={t(form.busy ? 'loan.submitting' : 'loan.submit')}
            onPress={form.submit}
            loading={form.busy}
          />
        </View>
      }
    >
      <HeaderCard
        title={t('loan.title')}
        subtitle={t(context.vehicleLabel ? 'loan.subtitleVehicle' : 'loan.subtitle', { vehicle: context.vehicleLabel })}
        style={styles.card}
      />

      <TitledCard title={t('loan.section.loan')} style={styles.card}>
        <View style={styles.fields}>
          <TextField
            label={t('loan.amount')}
            placeholder="800000"
            value={values.loanAmount}
            onChangeText={form.setAmount('loanAmount')}
            keyboardType="number-pad"
            {...next(refs.down)}
          />
          <TextField
            ref={refs.down}
            label={t('loan.downPayment')}
            placeholder={t('loan.optional')}
            value={values.downPayment}
            onChangeText={form.setAmount('downPayment')}
            keyboardType="number-pad"
            {...next(refs.name)}
          />
          <AppText variant="label" color={colors.heading}>
            {t('loan.tenure')}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {LOAN_TENURES.map(months => (
              <ChoiceChip
                key={months}
                label={t('loan.months', { count: months })}
                selected={values.tenureMonths === months}
                onPress={() => form.set('tenureMonths')(months)}
              />
            ))}
          </ScrollView>
        </View>
      </TitledCard>

      <TitledCard title={t('loan.section.you')} style={styles.card}>
        <View style={styles.fields}>
          <TextField
            ref={refs.name}
            label={t('loan.name')}
            value={values.name}
            onChangeText={form.set('name')}
            autoCapitalize="words"
            {...next(refs.email)}
          />
          <TextField
            ref={refs.email}
            label={t('loan.email')}
            placeholder={t('loan.optional')}
            value={values.email}
            onChangeText={form.set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            {...next(refs.city)}
          />
          <TextField
            ref={refs.city}
            label={t('loan.city')}
            placeholder={t('loan.optional')}
            value={values.city}
            onChangeText={form.set('city')}
            autoCapitalize="words"
            {...next(refs.pan)}
          />
          <TextField
            ref={refs.pan}
            label={t('loan.pan')}
            placeholder="ABCDE1234F"
            value={values.pan}
            onChangeText={form.setPan}
            autoCapitalize="characters"
            autoCorrect={false}
            {...next(refs.income)}
          />
          <TextField
            ref={refs.income}
            label={t('loan.income')}
            placeholder={t('loan.optional')}
            value={values.monthlyIncome}
            onChangeText={form.setAmount('monthlyIncome')}
            keyboardType="number-pad"
            returnKeyType="done"
          />
          <AppText variant="label" color={colors.heading}>
            {t('loan.employment')}
          </AppText>
          <View style={styles.row}>
            {EMPLOYMENT_TYPES.map(type => (
              <ChoiceChip
                key={type}
                label={t(`loan.employmentType.${type}`)}
                selected={values.employmentType === type}
                onPress={() => form.set('employmentType')(type)}
                style={styles.flex}
              />
            ))}
          </View>
        </View>
      </TitledCard>

      <CheckRow
        label={t('loan.consent')}
        checked={form.consent}
        onToggle={form.toggleConsent}
        style={styles.consent}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  fields: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  consent: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  footer: {
    gap: spacing.sm,
  },
  doneButton: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});

export default LoanApplication;
