import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, IconButton, ScreenContainer, SegmentedControl } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { isPhone, phoneError } from '../../../utils/validators';
import { tNow, useT } from '../../../i18n';
import { getOtpChannels, sendLoginOtp } from '../../../api/services/auth.api';
import { ROUTES } from '../../../navigation/routes';
import useStatusBarStyle from '../../../hooks/useStatusBarStyle';
import useKeyboardVisible from '../../../hooks/useKeyboardVisible';
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
// The code comes on WhatsApp or by SMS - whichever the server offers (as the
// web); when it offers both, a WhatsApp / SMS switch picks one. The button
// says where the code goes ("Get OTP on WhatsApp").
// With the keyboard up the spacing tightens so the logo, the field and the
// button all stay on screen, even on small phones.
// Or "Browse cars without login": the marketplace as a guest (remembered, so
// the app opens there next time).
// params: { fromGuest? } - opened by a guest from inside the app: a close
// button takes them back, and after logging in they return to that screen.
function Login({ navigation, route }) {
  useStatusBarStyle('light-content');
  const t = useT();
  const fromGuest = !!route?.params?.fromGuest;
  const keyboardOpen = useKeyboardVisible();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // How the code can be sent ([] = not known: the server picks) and the choice.
  const [channels, setChannels] = useState([]);
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getOtpChannels().then(list => {
      if (!cancelled && list.length > 0) {
        setChannels(list);
        setChannel(current => (current && list.includes(current) ? current : list[0]));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      const { otpToken, resendAfter, devHint } = await sendLoginOtp(channel ? { phone, channel } : { phone });
      navigation.navigate(ROUTES.VERIFY_OTP, {
        channel: 'phone',
        ...(channel ? { via: channel } : null),
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
      <View style={[styles.content, keyboardOpen && styles.contentCompact]}>
        <Image
          source={logo}
          resizeMode="contain"
          style={[styles.logo, keyboardOpen && styles.logoCompact]}
          accessibilityLabel="Turag"
        />

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
          style={[styles.phone, keyboardOpen && styles.phoneCompact]}
        />
        {channels.length > 1 ? (
          <SegmentedControl
            options={channels.map(value => ({ value, label: t(`auth.via.${value}`) }))}
            value={channel}
            onChange={setChannel}
            style={styles.channels}
          />
        ) : null}
        <Button
          title={t(channel ? `auth.getOtpVia.${channel}` : 'auth.getOtp')}
          variant="light"
          loading={loading}
          onPress={onGetOtp}
          style={[styles.button, keyboardOpen && styles.buttonCompact]}
        />
        {fromGuest ? null : <BrowseLink onPress={browseAsGuest} style={styles.browse} />}

        {/* The website's Terms / Privacy Policy, inside the app. */}
        <TermsNote
          onTerms={() => openPage('profile.item.terms', '/terms')}
          onPrivacy={() => openPage('profile.item.privacyPolicy', '/privacy_policy')}
          style={[styles.terms, keyboardOpen && styles.termsCompact]}
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
  // Keyboard up: tighter spacing so everything fits above it, still centred
  // in the space left (no empty band over the keyboard).
  contentCompact: {
    paddingVertical: spacing.md,
  },
  logoCompact: {
    marginBottom: spacing.xxl,
  },
  phoneCompact: {
    marginTop: spacing.lg,
  },
  buttonCompact: {
    marginTop: spacing.lg,
  },
  termsCompact: {
    marginTop: spacing.lg,
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
  channels: {
    marginTop: spacing.lg,
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
