import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Header,
  Icon,
  OTPInput,
  ScreenContainer,
  TextField,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { HIT_SLOP } from '../../../constants/layout';
import { ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import { ROUTES } from '../../../navigation/routes';
import FormError from '../components/FormError';
import TextLink from '../components/TextLink';
import useEmailLogin, { CODE_LENGTH } from './useEmailLogin';

// "Have an email & password? Sign in here" (as the web's /login, ADR-0033):
// for accounts Turag's team created (dealers) - there's no sign-up here.
// "Forgot password?" resets it with a code on WhatsApp (ADR-0054). Everyone
// else uses their mobile number ("Use your mobile number instead" goes back).
// A dealer email added to an existing account first confirms with a code sent
// to that account's mobile (the second step, as the web).
// params: { fromGuest? } - passed on from Login (back to the screen they were on).
function EmailLogin({ navigation }) {
  const t = useT();
  const form = useEmailLogin(navigation);
  const passwordRef = useRef(null);
  const { errors } = form;
  const confirming = form.step === 'confirm';

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={confirming ? form.back : navigation.goBack} />}
      footer={
        <Button
          title={t(confirming ? 'auth.emailLogin.confirm.button' : 'auth.emailLogin.button')}
          loading={form.loading}
          onPress={form.submit}
        />
      }
    >
      {confirming ? (
        <>
          <AppText variant="h2" style={styles.title}>
            {t('auth.emailLogin.confirm.title')}
          </AppText>
          <AppText variant="subtitle" style={styles.subtitle}>
            {t('auth.emailLogin.confirm.subtitle', { phone: form.phoneHint })}
          </AppText>

          <View style={styles.fields}>
            <AppText variant="label" style={styles.codeLabel}>
              {t('auth.emailLogin.confirm.code')}
            </AppText>
            <OTPInput length={CODE_LENGTH} value={form.code} onChangeText={form.setCode} />
          </View>

          <FormError message={errors.code} />

          <FormError message={errors.form} />

          <View style={styles.resend}>
            <AppText variant="caption">{t('auth.emailLogin.confirm.noCode')}</AppText>
            {form.resendIn > 0 ? (
              <AppText variant="caption" color={colors.body}>
                {t('auth.forgot.resendIn', { seconds: form.resendIn })}
              </AppText>
            ) : (
              <TextLink label={t('auth.forgot.resend')} onPress={form.resend} disabled={form.loading} />
            )}
          </View>
        </>
      ) : (
        <>
          <AppText variant="h2" style={styles.title}>
            {t('auth.emailLogin.title')}
          </AppText>
          <AppText variant="subtitle" style={styles.subtitle}>
            {t('auth.emailLogin.subtitle')}
          </AppText>

          <View style={styles.fields}>
            <TextField
              label={t('auth.create.email')}
              placeholder="you@example.com"
              value={form.email}
              onChangeText={form.setEmail}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="email"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <TextField
              ref={passwordRef}
              label={t('auth.emailLogin.password')}
              placeholder={t('auth.emailLogin.passwordPlaceholder')}
              value={form.password}
              onChangeText={form.setPassword}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={form.submit}
            />
          </View>

          <FormError message={errors.form} />

          <TextLink
            label={t('auth.emailLogin.forgot')}
            onPress={() =>
              navigation.navigate(ROUTES.FORGOT_PASSWORD, {
                identifier: form.email.trim(),
              })
            }
            style={styles.note}
          />

          <Pressable
            onPress={navigation.goBack}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            style={({ pressed }) => [styles.phoneLink, pressed && styles.pressed]}
          >
            <Icon name="phone" size={ms(16)} color={colors.primary} />
            <AppText variant="label" color={colors.primary}>
              {t('auth.emailLogin.usePhone')}
            </AppText>
          </Pressable>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  fields: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  codeLabel: {
    marginBottom: -spacing.lg + spacing.sm,
  },
  note: {
    marginTop: spacing.xl,
  },
  resend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  phoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default EmailLogin;
