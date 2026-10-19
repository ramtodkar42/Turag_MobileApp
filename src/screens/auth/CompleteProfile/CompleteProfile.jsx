import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Header,
  ScreenContainer,
  TextField,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { endSession } from '../../../api/session';
import { getHomeRoute } from '../../../navigation/homeRoute';
import { ROUTES } from '../../../navigation/routes';
import { clearUser } from '../../../store/userStore';
import completeSignUp from './completeSignUp';
import ConsentList from './components/ConsentList';
import EmailVerifyAction from './components/EmailVerifyAction';
import PurposePicker from './components/PurposePicker';
import { CONSENTS, PURPOSES } from './constants';
import useProfileForm from './useProfileForm';
import { useT } from '../../../i18n';

// Create Account (after the mobile OTP, already signed in): name, email with
// "Verify" (marks it verified straight away), "What brings you" and the
// consents; "Accept & Continue" saves them and opens Home.
// Only the steps the user still owes are shown: an inspector (or anyone with a
// name) who hasn't accepted the terms sees just the Terms & Conditions.
// Back = "use a different number": signs out and returns to Login.
// params: { phone, needsProfile?, needsConsent? }
function CompleteProfile({ navigation, route }) {
  const { needsProfile = true, needsConsent = true } = route.params ?? {};
  const t = useT();
  const emailRef = useRef(null);

  const form = useProfileForm({
    needsProfile,
    needsConsent,
    onSubmit: async ({ consents, ...values }) => {
      const user = await completeSignUp({
        needsProfile,
        needsConsent,
        values,
        consents,
      });
      const titleKey = needsProfile ? 'auth.accountCreated' : 'auth.loginSuccessful';
      navigation.reset({
        index: 0,
        routes: [
          {
            name: ROUTES.AUTH_SUCCESS,
            params: { titleKey, next: getHomeRoute(user.role) },
          },
        ],
      });
    },
  });
  const { values, errors } = form;

  const changeNumber = () => {
    endSession({ remote: true });
    clearUser();
    navigation.reset({ index: 0, routes: [{ name: ROUTES.LOGIN }] });
  };

  const openLink = title =>
    navigation.navigate(ROUTES.PROFILE_SECTION, { title, showBack: true });

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={changeNumber} />}
      footer={
        <Button
          title={needsConsent ? t('auth.create.acceptContinue') : t('common.continue')}
          loading={form.loading}
          disabled={!form.canAccept}
          onPress={form.submit}
        />
      }
    >
      <AppText variant="h2" style={styles.title}>
        {needsProfile ? t('auth.create.title') : t('auth.create.almostTitle')}
      </AppText>
      <AppText variant="subtitle" style={styles.subtitle}>
        {needsProfile
          ? t('auth.create.subtitle')
          : t('auth.create.almostSubtitle')}
      </AppText>

      {needsProfile ? (
        <>
          <View style={styles.fields}>
            <TextField
              label={t('auth.create.name')}
              placeholder={t('auth.create.namePlaceholder')}
              value={values.fullName}
              onChangeText={form.setField('fullName')}
              error={errors.fullName}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <TextField
              ref={emailRef}
              label={t('auth.create.email')}
              placeholder="you@example.com"
              value={values.email}
              onChangeText={form.setField('email')}
              error={errors.email}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={
                form.emailVerified ? undefined : form.verifyEmail
              }
              right={
                <EmailVerifyAction
                  verified={form.emailVerified}
                  onVerify={form.verifyEmail}
                />
              }
            />
          </View>

          <PurposePicker
            options={PURPOSES}
            value={values.purpose}
            onChange={form.setField('purpose')}
            error={errors.purpose}
            style={styles.section}
          />
        </>
      ) : null}

      {needsConsent ? (
        <ConsentList
          items={CONSENTS}
          values={form.consents}
          onToggle={form.toggleConsent}
          onOpenLink={openLink}
          error={errors.consents}
          style={styles.section}
        />
      ) : null}

      {errors.form ? (
        <AppText
          variant="caption"
          color={colors.danger}
          style={styles.formError}
        >
          {errors.form}
        </AppText>
      ) : null}
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
  section: {
    marginTop: spacing.xl,
  },
  formError: {
    marginTop: spacing.sm,
  },
});

export default CompleteProfile;
