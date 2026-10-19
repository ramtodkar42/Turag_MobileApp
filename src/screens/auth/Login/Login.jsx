import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText, Button, ScreenContainer } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { isPhone, phoneError } from '../../../utils/validators';
import { tNow, useT } from '../../../i18n';
import { sendLoginOtp } from '../../../api/services/auth.api';
import { ROUTES } from '../../../navigation/routes';
import useStatusBarStyle from '../../../hooks/useStatusBarStyle';
import PhoneField from './components/PhoneField';
import TermsNote from './components/TermsNote';

const logo = require('../../../assets/icons/turaglogowhite.png');
const LOGO_RATIO = 1248 / 332; // width / height of the PNG

// Terms / privacy pages are wired up once their URLs are ready.
const noop = () => {};

const getPhoneProblem = phone => {
  if (phone.length < 10) {
    return tNow('errors.phoneLength');
  }
  return isPhone(phone) ? '' : phoneError();
};

// Red login screen: mobile number -> OTP (VerifyOtp decides Home vs new account).
function Login({ navigation }) {
  useStatusBarStyle('light-content');
  const t = useT();
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

  return (
    <ScreenContainer scroll backgroundColor={colors.primary}>
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

        <TermsNote onTerms={noop} onPrivacy={noop} style={styles.terms} />
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
  terms: {
    marginTop: ms(40),
    paddingHorizontal: spacing.lg,
  },
});

export default Login;
