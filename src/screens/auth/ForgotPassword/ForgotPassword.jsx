import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  CheckCircle,
  Header,
  OTPInput,
  PopIn,
  ScreenContainer,
  StatusView,
  TextField,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import { ROUTES } from '../../../navigation/routes';
import FormError from '../components/FormError';
import TextLink from '../components/TextLink';
import useForgotPassword, { CODE_LENGTH } from './useForgotPassword';

// "Forgot password?" from email sign-in (as the web's /forgot-password,
// ADR-0054): email or mobile number -> a code on WhatsApp to the account's
// registered number -> the code and a new password -> sign in again.
// params: { identifier? } - the email typed on the sign-in screen.
function ForgotPassword({ navigation, route }) {
  const t = useT();
  const form = useForgotPassword(route.params?.identifier ?? '');
  const confirmRef = useRef(null);
  const backToSignIn = () => navigation.popTo(ROUTES.EMAIL_LOGIN);
  const header = <Header onBack={navigation.goBack} />;

  if (form.step === 'done') {
    return (
      <ScreenContainer
        header={header}
        footer={<Button title={t('auth.forgot.signIn')} onPress={backToSignIn} />}
      >
        <StatusView
          icon={
            <PopIn>
              <CheckCircle size={ms(84)} />
            </PopIn>
          }
          title={t('auth.forgot.doneTitle')}
          message={t('auth.forgot.doneSubtitle')}
        />
      </ScreenContainer>
    );
  }

  const identify = form.step === 'identify';
  return (
    <ScreenContainer
      scroll
      header={header}
      footer={
        <Button
          title={t(identify ? 'auth.forgot.send' : 'auth.forgot.save')}
          loading={form.busy}
          onPress={identify ? form.sendCode : form.submit}
        />
      }
    >
      <AppText variant="h2" style={styles.title}>
        {t('auth.forgot.title')}
      </AppText>
      <AppText variant="subtitle" style={styles.subtitle}>
        {t(identify ? 'auth.forgot.identifySubtitle' : 'auth.forgot.resetSubtitle')}
      </AppText>

      {identify ? (
        <TextField
          label={t('auth.forgot.identifier')}
          placeholder={t('auth.forgot.identifierPlaceholder')}
          value={form.identifier}
          onChangeText={form.setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          autoComplete="username"
          returnKeyType="send"
          onSubmitEditing={form.sendCode}
          style={styles.fields}
        />
      ) : (
        <View style={styles.fields}>
          <View>
            <AppText variant="label" style={styles.codeLabel}>
              {t('auth.forgot.code')}
            </AppText>
            <OTPInput length={CODE_LENGTH} value={form.code} onChangeText={form.setCode} />
          </View>
          <TextField
            label={t('auth.forgot.newPassword')}
            placeholder={t('auth.forgot.newPasswordPlaceholder')}
            value={form.password}
            onChangeText={form.setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            autoComplete="password-new"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <TextField
            ref={confirmRef}
            label={t('auth.forgot.confirm')}
            placeholder={t('auth.forgot.confirmPlaceholder')}
            value={form.confirm}
            onChangeText={form.setConfirm}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            autoComplete="password-new"
            returnKeyType="go"
            onSubmitEditing={form.submit}
          />
        </View>
      )}

      <FormError message={form.error} />

      {identify ? null : (
        <View style={styles.links}>
          <AppText variant="caption">{t('auth.forgot.noCode')}</AppText>
          {form.resendIn > 0 ? (
            <AppText variant="caption" color={colors.body}>
              {t('auth.forgot.resendIn', { seconds: form.resendIn })}
            </AppText>
          ) : (
            <TextLink label={t('auth.forgot.resend')} onPress={form.sendCode} disabled={form.busy} />
          )}
        </View>
      )}
      {identify ? null : (
        <TextLink
          label={t('auth.forgot.different')}
          onPress={form.changeIdentifier}
          style={styles.centered}
        />
      )}
      <TextLink label={t('auth.forgot.remembered')} onPress={backToSignIn} style={styles.back} />
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
    marginBottom: spacing.sm,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  centered: {
    marginTop: spacing.md,
  },
  back: {
    marginTop: spacing.xl,
  },
});

export default ForgotPassword;
