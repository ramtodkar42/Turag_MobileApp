import { useEffect, useRef, useState } from 'react';
import { NativeModules, Platform, StyleSheet } from 'react-native';
import { AppText, Button, Header, OTPInput, ScreenContainer } from '../../../components';
import { colors, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import useCountdown from '../../../hooks/useCountdown';
import ResendOtp from './components/ResendOtp';
import otpChannels from './otpChannels';
import { resetAfterSignIn } from '../../../navigation/authRoutes';
import { useT } from '../../../i18n';

// The login code is 6 digits - the real SMS (MSG91) and the test server's
// `devHint` alike, as the web asks for. (The backend accepts 4-8 digits; this
// must match what the SMS actually sends.)
const OTP_LENGTH = 6;
const DEFAULT_RESEND_SECONDS = 59;
// The test server's code (`devHint`) is shown and filled in only in
// development builds - never in a release build, where it would let anyone
// sign in to any number if a server ever sent it.
const SHOW_TEST_OTP = __DEV__;
// Dev autofill waits a moment, like an SMS arriving, so the screen is seen first.
const DEV_AUTOFILL_DELAY = 600;

// OTP screen for the mobile login (otpChannels.js has the per-channel logic).
// params: { channel: 'phone', phone, otpToken, resendAfter?, devHint? }
function VerifyOtp({ navigation, route }) {
  const { channel = 'phone', ...initialParams } = route.params ?? {};
  const t = useT();
  const otpChannel = otpChannels[channel];
  // Resend gives a new OTP token (and wait time), so the latest params live in state.
  const [params, setParams] = useState(initialParams);
  const otpLength = OTP_LENGTH;
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { remaining, isDone, restart } = useCountdown(
    initialParams.resendAfter ?? DEFAULT_RESEND_SECONDS,
  );
  // Blocks a second Verify while the first is still running (e.g. auto-submit + tap).
  const verifying = useRef(false);

  const onVerify = async (code = otp) => {
    if (verifying.current || resending || code.length < otpLength) {
      return;
    }
    verifying.current = true;
    setLoading(true);
    try {
      const next = await otpChannel.verify(params, code);
      if (next.reset) {
        // Signed in: clear the login screens from history.
        resetAfterSignIn(navigation, next.reset);
      } else {
        setLoading(false);
        verifying.current = false;
        navigation.navigate(...next.navigate);
      }
    } catch (e) {
      setError(e.message || t('auth.verify.invalid'));
      setLoading(false);
      verifying.current = false;
    }
  };

  // Typing the last digit verifies straight away (no extra tap).
  const onChangeOtp = value => {
    setOtp(value);
    setError('');
    if (value.length === otpLength) {
      onVerify(value);
    }
  };

  // Real SMS: the keyboard offers the code (OTPInput's sms-otp / oneTimeCode).
  // Dev / test server: no SMS is sent and the code comes back as devHint, so
  // fill it in the same way - unless the user has started typing. A resend
  // (new OTP token) fills the new code.
  const latest = useRef({ otp, onChangeOtp });
  latest.current = { otp, onChangeOtp };
  useEffect(() => {
    // Previous development-only behavior:
    // if (!__DEV__ || !params.devHint) {
    if (!SHOW_TEST_OTP || !params.devHint) {
      return undefined;
    }
    const timer = setTimeout(() => {
      if (latest.current.otp === '') {
        latest.current.onChangeOtp(String(params.devHint));
      }
    }, DEV_AUTOFILL_DELAY);
    return () => clearTimeout(timer);
  }, [params.devHint, params.otpToken]);

  // Real SMS on Android: Google's SMS User Consent API. When the OTP SMS
  // arrives, Android asks once ("Allow Turag to read this message?"); on Allow
  // the code fills in and verifies. Needs no app hash, so it works with the
  // DLT-approved MSG91 template. No-op on iOS (the keyboard's oneTimeCode
  // suggestion covers it), with devHint, or on a build without the module.
  useEffect(() => {
    // The library calls its native module from an async function, so a build
    // without it would raise an uncatchable "startNativeSmsListener of null".
    // Check the module is really there first.
    if (Platform.OS !== 'android' || params.devHint || !NativeModules.ReactNativeSmsUserConsent) {
      return undefined;
    }
    let stop;
    try {
      const consent = require('@eabdullazyanov/react-native-sms-user-consent');
      stop = consent.startSmsHandling(event => {
        const code = consent.retrieveVerificationCode(event?.sms ?? '', otpLength);
        if (code && latest.current.otp === '') {
          latest.current.onChangeOtp(code);
        }
      });
    } catch {
      return undefined;
    }
    return () => {
      try {
        stop?.();
      } catch {
        // already stopped
      }
    };
  }, [params.devHint, params.otpToken, otpLength]);

  const onResend = async () => {
    // Don't resend while a verify (or another resend) is still running.
    if (loading || resending) {
      return;
    }
    setResending(true);
    setOtp('');
    setError('');
    try {
      const updates = await otpChannel.resend(params);
      // The wait starts again only once a new code is on its way - a failed
      // resend can be tried again straight away.
      if (updates) {
        setParams(prev => ({ ...prev, ...updates }));
      }
      restart(updates?.resendAfter ?? undefined);
    } catch (e) {
      setError(e.message || t('auth.verify.resendError'));
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenContainer scroll header={<Header onBack={navigation.goBack} />}>
      <AppText variant="h2" style={styles.title}>
        {t('auth.verify.title')}
      </AppText>
      <AppText variant="subtitle">{t('auth.verify.sentTo', { count: otpLength })}</AppText>
      <AppText variant="title">{otpChannel.sentTo(params)}</AppText>

      <OTPInput length={otpLength} value={otp} onChangeText={onChangeOtp} style={styles.otp} />
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
      {/* Previous development-only behavior:
      {__DEV__ && params.devHint ? (
        <AppText variant="caption" style={styles.error}>
          {t('auth.verify.testCode', { code: params.devHint })}
        </AppText>
      ) : null}
      */}
      {SHOW_TEST_OTP && params.devHint ? (
        <AppText variant="caption" style={styles.error}>
          {t('auth.verify.testCode', { code: params.devHint })}
        </AppText>
      ) : null}

      <Button
        title={t('auth.verify.button')}
        onPress={() => onVerify()}
        loading={loading}
        disabled={otp.length < otpLength || resending}
        style={styles.verify}
      />
      <ResendOtp
        remaining={remaining}
        isDone={isDone}
        onResend={onResend}
        disabled={loading || resending}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: ms(88),
    marginBottom: spacing.xs,
  },
  otp: {
    marginTop: ms(48),
  },
  error: {
    marginTop: spacing.sm,
  },
  verify: {
    marginTop: ms(48),
  },
});

export default VerifyOtp;
