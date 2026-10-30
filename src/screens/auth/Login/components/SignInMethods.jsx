import { StyleSheet, View } from 'react-native';
import { AppText, Button, GoogleMark, Icon, WhatsAppMark } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import KeyboardFade from './KeyboardFade';

const MARK = ms(26);

// A brand mark in a white circle (Google's / WhatsApp's own colours on red).
function MarkCircle({ children }) {
  return <View style={styles.mark}>{children}</View>;
}

// How to sign in, as the web's sign-in sheet: WhatsApp first ("Continue with
// WhatsApp"), then "OR" and SMS / Google side by side. Only what's on offer
// shows: SMS when the server has an SMS provider, Google when it's set up.
// channels: the server's code channels ([] = unknown: one "Get OTP", the
//   server picks); ready: the 18+ box is ticked (the code buttons look
//   inactive until then, and say why when tapped); sending: the channel whose
//   code is on its way; google: { show, busy, error, onPress }.
// compact: the keyboard is open - the "OR" choices fade away (staying in place,
// so nothing moves) and come back once it closes.
function SignInMethods({ channels, ready, sending, onCode, google, compact = false, style }) {
  const t = useT();
  const primary = channels.includes('whatsapp') ? 'whatsapp' : channels[0] ?? null;
  const sms = primary === 'whatsapp' && channels.includes('sms');
  const busy = !!sending || google.busy;

  return (
    <View style={style}>
      <Button
        title={t(primary ? `auth.continueVia.${primary}` : 'auth.getOtp')}
        variant="light"
        loading={sending === (primary ?? 'any')}
        disabled={false}
        onPress={() => onCode(primary)}
        leftIcon={
          primary === 'whatsapp' ? (
            <WhatsAppMark size={ms(20)} />
          ) : primary === 'sms' ? (
            <Icon name="phone" size={ms(18)} color={colors.primary} />
          ) : null
        }
        style={[styles.primary, !ready && styles.waiting]}
      />

      {sms || google.show ? (
        <KeyboardFade hidden={compact}>
          <View style={styles.orRow}>
            <View style={styles.line} />
            <AppText variant="caption" color={colors.white} style={styles.or}>
              {t('auth.google.or')}
            </AppText>
            <View style={styles.line} />
          </View>
          <View style={styles.row}>
            {sms ? (
              <Button
                title={t('auth.via.sms')}
                variant="lightOutline"
                size="lg"
                fullWidth={false}
                loading={sending === 'sms'}
                disabled={false}
                onPress={() => !busy && onCode('sms')}
                leftIcon={<Icon name="phone" size={ms(18)} color={colors.white} />}
                style={[styles.flex, !ready && styles.waiting]}
              />
            ) : null}
            {google.show ? (
              <Button
                title={t(sms ? 'auth.google.short' : 'auth.google.button')}
                variant="lightOutline"
                size="lg"
                fullWidth={false}
                loading={google.busy}
                onPress={() => !busy && google.onPress()}
                leftIcon={
                  <MarkCircle>
                    <GoogleMark size={ms(16)} />
                  </MarkCircle>
                }
                style={styles.flex}
              />
            ) : null}
          </View>
          {google.error ? (
            <AppText variant="caption" color={colors.white} align="center" style={styles.error}>
              {google.error}
            </AppText>
          ) : null}
        </KeyboardFade>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    alignSelf: 'stretch',
  },
  // Not ready yet (18+ not ticked): looks inactive, still says why when tapped.
  waiting: {
    opacity: 0.6,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  or: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  error: {
    marginTop: spacing.sm,
  },
});

export default SignInMethods;
