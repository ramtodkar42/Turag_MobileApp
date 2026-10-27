import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  FadeIn,
  Header,
  Icon,
  InfoNote,
  ScreenContainer,
  TextField,
} from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { HIT_SLOP } from '../../../constants/layout';
import { ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import useEmailLogin from './useEmailLogin';

// "Have an email & password? Sign in here" (as the web's /login, ADR-0033):
// for accounts Turag's team created (dealers) - there's no sign-up here, and
// a lost password is reset by Turag's team. Everyone else uses their mobile
// number ("Use your mobile number instead" goes back).
// params: { fromGuest? } - passed on from Login (back to the screen they were on).
function EmailLogin({ navigation }) {
  const t = useT();
  const form = useEmailLogin(navigation);
  const passwordRef = useRef(null);
  const { errors } = form;

  return (
    <ScreenContainer
      scroll
      header={<Header onBack={navigation.goBack} />}
      footer={
        <Button
          title={t('auth.emailLogin.button')}
          loading={form.loading}
          onPress={form.submit}
        />
      }
    >
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

      {errors.form ? (
        <FadeIn offset={0} style={styles.formError}>
          <Icon
            name="close"
            size={ms(14)}
            color={colors.danger}
            strokeWidth={3}
          />
          <AppText variant="caption" color={colors.danger} style={styles.flex}>
            {errors.form}
          </AppText>
        </FadeIn>
      ) : null}

      <InfoNote style={styles.note}>{t('auth.emailLogin.forgot')}</InfoNote>

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
  formError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  flex: {
    flex: 1,
  },
  note: {
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
