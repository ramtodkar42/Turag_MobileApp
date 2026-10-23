import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, IconButton, ScreenContainer } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { isPhone, phoneError } from '../../../utils/validators';
import { tNow, useT } from '../../../i18n';
import { sendLoginOtp } from '../../../api/services/auth.api';
import { ROUTES } from '../../../navigation/routes';
import useStatusBarStyle from '../../../hooks/useStatusBarStyle';
import PhoneField from './components/PhoneField';
import { markGuestChosen } from '../../../utils/appPrefs';
import BrowseLink from './components/BrowseLink';
import TermsNote from './components/TermsNote';

const logo = require('../../../assets/icons/turaglogowhite.png');
const LOGO_RATIO = 1248 / 332; // width / height of the PNG

const getPhoneProblem = phone => {
  if (phone.length < 10) {
    return tNow('errors.phoneLength');
  }
  return isPhone(phone) ? '' : phoneError();
};

// Red login screen: mobile number -> OTP (VerifyOtp decides Home vs new account).
// Or "Browse cars without login": the marketplace as a guest (remembered, so
// the app opens there next time).
// params: { fromGuest? } - opened by a guest from inside the app: a close
// button takes them back, and after logging in they return to that screen.
function Login({ navigation, route }) {
  useStatusBarStyle('light-content');
  const t = useT();
  const fromGuest = !!route?.params?.fromGuest;
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChangePhone = value => {
    setPhone(value);
    setError('');
  };

  const onGetOtp = async () => {
    const problem = getPhoneProblem(phone);
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    try {
      const { otpToken, resendAfter, devHint } = await sendLoginOtp({ phone });
      navigation.navigate(ROUTES.VERIFY_OTP, {
        channel: 'phone',
        phone,
        otpToken,
        resendAfter,
        devHint,
      });
    } catch (e) {
      setError(e.message || t('auth.sendOtpError'));
    } finally {
      setLoading(false);
    }
  };

  const browseAsGuest = () => {
    markGuestChosen();
    navigation.reset({ index: 0, routes: [{ name: ROUTES.MAIN_TABS }] });
  };

  const openPage = (titleKey, path) => navigation.navigate(ROUTES.WEB_PAGE, { title: t(titleKey), path });

  return (
    <ScreenContainer
      scroll
      backgroundColor={colors.primary}
      header={
        fromGuest ? (
          <View style={styles.header}>
            <IconButton
              onPress={navigation.goBack}
              size={ms(40)}
              backgroundColor={colors.whiteTranslucent}
              accessibilityLabel={t('common.close')}
            >
              <Icon name="close" size={ms(20)} color={colors.white} />
            </IconButton>
          </View>
        ) : null
      }
    >
      <View style={styles.content}>
        <Image source={logo} resizeMode="contain" style={styles.logo} accessibilityLabel="Turag" />

        <AppText variant="h3" align="center" color={colors.white} style={styles.title}>
          {t('auth.welcome')}
        </AppText>
        <AppText variant="subtitle" align="center" color={colors.white} style={styles.subtitle}>
          {t('auth.tagline')}
        </AppText>

        <PhoneField
          value={phone}
          onChangeText={onChangePhone}
          error={error}
          onSubmitEditing={onGetOtp}
          style={styles.phone}
        />
        <Button title={t('auth.getOtp')} variant="light" loading={loading} onPress={onGetOtp} style={styles.button} />
        {fromGuest ? null : <BrowseLink onPress={browseAsGuest} style={styles.browse} />}

        {/* The website's Terms / Privacy Policy, inside the app. */}
        <TermsNote
          onTerms={() => openPage('profile.item.terms', '/terms')}
          onPrivacy={() => openPage('profile.item.privacyPolicy', '/privacy_policy')}
          style={styles.terms}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Centered block; scrolls when the keyboard is up on small phones.
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  logo: {
    width: ms(200),
    height: ms(200) / LOGO_RATIO,
    alignSelf: 'center',
    marginBottom: ms(64),
  },
  title: {
    fontSize: fs(22),
    lineHeight: fs(28),
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  phone: {
    marginTop: spacing.xl,
  },
  button: {
    marginTop: spacing.xl,
  },
  browse: {
    marginTop: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  terms: {
    marginTop: ms(32),
    paddingHorizontal: spacing.lg,
  },
});

export default Login;
