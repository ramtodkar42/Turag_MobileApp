import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  AppText,
  FadeIn,
  Icon,
  IconButton,
  ScreenContainer,
} from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { isPhone, phoneError } from '../../../utils/validators';
import { tNow, useT } from '../../../i18n';
import { getOtpChannels, sendLoginOtp } from '../../../api/services/auth.api';
import { ROUTES } from '../../../navigation/routes';
import useStatusBarStyle from '../../../hooks/useStatusBarStyle';
import useCompactOnKeyboard from '../../../hooks/useCompactOnKeyboard';
import PhoneField from './components/PhoneField';
import { markGuestChosen } from '../../../utils/appPrefs';
import LoginFooter from './components/LoginFooter';
import AgeConfirm from './components/AgeConfirm';
import SignInMethods from './components/SignInMethods';
import TrustNote from './components/TrustNote';
import KeyboardFade from './components/KeyboardFade';
import GooglePhoneNote from './components/GooglePhoneNote';
import useGoogleSignIn from './useGoogleSignIn';
import { googleSignInConfigured } from '../../../api/googleAuth';

const logo = require('../../../assets/icons/turaglogowhite.png');
const LOGO_RATIO = 1248 / 332; // width / height of the PNG
// Share of the free height above the content (the rest below): 0.5 = middle.
const TOP_SHARE = 0.4;

const getPhoneProblem = phone => {
  if (phone.length < 10) {
    return tNow('errors.phoneLength');
  }
  return isPhone(phone) ? '' : phoneError();
};

// Red login screen, as the web's sign-in: the mobile number, "I confirm I am
// 18 years of age or older.", then "Continue with WhatsApp" (the default) and,
// under "OR", SMS and Google side by side - SMS only when the server offers
// it. The code buttons wait for the 18+ box (they look inactive and say why
// when tapped). Mobile number -> OTP (VerifyOtp decides Home vs new account).
// With the keyboard up the spacing tightens so the logo, the field and the
// button all stay on screen, even on small phones.
// Google (as the web): signs straight in when the Google email belongs to an
// account; otherwise the mobile number is still needed (the account is the
// phone) and the Google email is linked after the OTP.
// Or "Browse cars without login": the marketplace as a guest (remembered, so
// the app opens there next time).
// params: { fromGuest? } - opened by a guest from inside the app: a close
// button takes them back, and after logging in they return to that screen.
function Login({ navigation, route }) {
  useStatusBarStyle('light-content');
  const t = useT();
  const fromGuest = !!route?.params?.fromGuest;
  // Just deleted their account (Profile > Delete account): say so once.
  const accountDeleted = !!route?.params?.accountDeleted;
  // Signed out because the session ran out (or was ended on another device).
  const sessionExpired = !!route?.params?.sessionExpired;
  let notice = null;
  if (accountDeleted) notice = { icon: 'check', textKey: 'auth.accountDeleted' };
  else if (sessionExpired) notice = { icon: 'clock', textKey: 'auth.sessionExpired' };
  // Typing: the extra choices step aside (smoothly, from the moment the number
  // box is tapped) so the logo and the number stay above the keyboard.
  // (No layout animation: nothing is added / removed, only faded - see KeyboardFade.)
  const { compact: keyboardOpen, onFocus: onPhoneFocus } = useCompactOnKeyboard({ animate: false });
  // Where the content sits: centred in the screen as measured with the
  // keyboard CLOSED, then held there - so opening / closing the keyboard
  // never re-centres it (no logo jumping up and back). Only the extra choices
  // under the main button fade away while typing.
  const [frame, setFrame] = useState({ area: 0, block: 0 });
  const onAreaLayout = e => {
    if (keyboardOpen) return; // the keyboard shrinks the area on some phones
    const area = e.nativeEvent.layout.height;
    setFrame(f => (f.area === area ? f : { ...f, area }));
  };
  const onBlockLayout = e => {
    if (keyboardOpen) return; // shorter while typing; keep the full height
    const block = e.nativeEvent.layout.height;
    setFrame(f => (f.block === block ? f : { ...f, block }));
  };
  // A little above the middle (the eye's centre), which also leaves the main
  // button room above the keyboard on every phone.
  const top =
    frame.area > 0 && frame.block > 0
      ? Math.max(spacing.xl, (frame.area - frame.block) * TOP_SHARE)
      : null;
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  // 18+ confirmed (as the web); ageNeeded: a code button was tapped first.
  const [ageOk, setAgeOk] = useState(false);
  const [ageNeeded, setAgeNeeded] = useState(false);
  // The channel whose code is on its way ('whatsapp' | 'sms' | 'any'), or null.
  const [sendingVia, setSendingVia] = useState(null);
  // How the code can be sent, WhatsApp first ([] = not known: the server picks).
  const [channels, setChannels] = useState([]);
  const google = useGoogleSignIn(navigation);

  useEffect(() => {
    let cancelled = false;
    getOtpChannels().then(list => {
      if (!cancelled && list.length > 0) {
        setChannels(list);
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

  const toggleAge = () => {
    setAgeOk(on => !on);
    setAgeNeeded(false);
  };

  // The keyboard's Done key and the buttons can all fire: one code only.
  // channel: 'whatsapp' | 'sms' | null (the server picks).
  const sending = useRef(false);
  const onGetOtp = async channel => {
    if (sending.current) return;
    const problem = getPhoneProblem(phone);
    if (problem) {
      setError(problem);
      return;
    }
    if (!ageOk) {
      setAgeNeeded(true);
      return;
    }
    sending.current = true;
    setSendingVia(channel ?? 'any');
    try {
      const { otpToken, resendAfter, devHint } = await sendLoginOtp(
        channel ? { phone, channel } : { phone },
      );
      navigation.navigate(ROUTES.VERIFY_OTP, {
        channel: 'phone',
        ...(channel ? { via: channel } : null),
        phone,
        otpToken,
        resendAfter,
        devHint,
        // From Google: linked after the OTP, and its name / email prefilled.
        ...(google.google ? { google: google.google } : null),
      });
    } catch (e) {
      setError(e.message || t('auth.sendOtpError'));
    } finally {
      sending.current = false;
      setSendingVia(null);
    }
  };
  // The keyboard's Done key: the default way (WhatsApp when offered).
  const defaultChannel = channels.includes('whatsapp') ? 'whatsapp' : channels[0] ?? null;

  const browseAsGuest = () => {
    markGuestChosen();
    navigation.reset({ index: 0, routes: [{ name: ROUTES.MAIN_TABS }] });
  };

  const openPage = (titleKey, path) =>
    navigation.navigate(ROUTES.WEB_PAGE, { title: t(titleKey), path });

  return (
    <ScreenContainer
      scroll
      // The content stays put while typing: no layout animation to run (on
      // Android one can flicker the whole screen for a frame).
      animateKeyboard={false}
      // The number box sits high, above the keyboard on every phone: no
      // automatic scroll to it (that only pushed the content up).
      followFocus={false}
      // No room made for the keyboard: nothing moves; what it covers (the
      // faded choices) is simply under it. On phones that also shrink the
      // screen, that room was counted twice and the page scrolled up.
      keyboardRoom={false}
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
      <View
        style={[styles.area, top != null ? { paddingTop: top } : styles.areaMeasuring]}
        onLayout={onAreaLayout}
        testID="login-area"
      >
      <View onLayout={onBlockLayout} testID="login-block">
        <Image
          source={logo}
          resizeMode="contain"
          style={styles.logo}
          accessibilityLabel="Turag"
        />

        <AppText
          variant="h3"
          align="center"
          color={colors.white}
          style={styles.title}
        >
          {t('auth.welcome')}
        </AppText>
        <AppText
          variant="subtitle"
          align="center"
          color={colors.white}
          style={styles.subtitle}
        >
          {t('auth.tagline')}
        </AppText>

        {notice && !google.google ? (
          <FadeIn offset={0} style={styles.deletedNote}>
            <Icon
              name={notice.icon}
              size={ms(16)}
              color={colors.white}
              strokeWidth={3}
            />
            <AppText
              variant="caption"
              color={colors.white}
              style={styles.deletedText}
            >
              {t(notice.textKey)}
            </AppText>
          </FadeIn>
        ) : null}

        {google.google ? (
          <GooglePhoneNote
            email={google.google.email}
            onCancel={google.cancelGoogle}
            style={styles.googleNote}
          />
        ) : null}

        <PhoneField
          value={phone}
          onChangeText={onChangePhone}
          error={error}
          onSubmitEditing={() => onGetOtp(defaultChannel)}
          onFocus={onPhoneFocus}
          style={styles.phone}
        />
        <AgeConfirm
          checked={ageOk}
          onToggle={toggleAge}
          error={ageNeeded}
          style={styles.age}
        />
        <SignInMethods
          channels={channels}
          ready={ageOk}
          sending={sendingVia}
          onCode={onGetOtp}
          google={{
            show: googleSignInConfigured && !google.google,
            busy: google.busy,
            error: google.error,
            onPress: google.start,
          }}
          // Keyboard open: everything under the main button fades away in place
          // (nothing re-lays out, so nothing moves or blinks) and fades back.
          compact={keyboardOpen}
          style={styles.button}
        />
        <KeyboardFade hidden={keyboardOpen}>
          <TrustNote style={styles.trust} />
          {/* One quiet bottom: browse | email sign-in (accounts Turag created,
              e.g. dealers), and the website's Terms / Privacy Policy under it. */}
          <LoginFooter
            onBrowse={fromGuest ? null : browseAsGuest}
            onEmail={() =>
              navigation.navigate(ROUTES.EMAIL_LOGIN, fromGuest ? { fromGuest } : undefined)
            }
            onTerms={() => openPage('profile.item.terms', '/terms')}
            onPrivacy={() => openPage('profile.item.privacyPolicy', '/privacy_policy')}
            style={styles.footer}
          />
        </KeyboardFade>
      </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // The whole screen below the header. The block sits where centring puts it
  // with the keyboard closed (paddingTop, measured) - and stays there.
  area: {
    flex: 1,
    paddingBottom: spacing.xl,
  },
  // The very first frame, while it's measured: not shown yet (so it never
  // appears in one place and then settles in another).
  areaMeasuring: {
    paddingTop: spacing.xl,
    opacity: 0,
  },
  logo: {
    width: ms(200),
    height: ms(200) / LOGO_RATIO,
    alignSelf: 'center',
    marginBottom: ms(48),
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
  age: {
    marginTop: spacing.lg,
  },
  button: {
    marginTop: spacing.lg,
  },
  trust: {
    marginTop: spacing.lg,
  },
  deletedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.whiteTranslucent,
  },
  deletedText: {
    flex: 1,
  },
  googleNote: {
    marginTop: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
  },
});

export default Login;
