import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, ButtonRow, Card, FadeIn, Icon, OTPInput } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { CODE_LENGTH } from '../usePhoneVerification';

const ICON = ms(40);

// The account's mobile (as the web's Account page): the number with a
// Verified / Not verified badge; not verified - "Verify by WhatsApp" (or SMS),
// then the code sent to that number. The code always goes to the number on the
// account. mobile / verified: from the account; phone: usePhoneVerification().
function MobileCard({ mobile, verified, phone, style }) {
  const t = useT();
  const { step, channel, code, setCode, busy, error, notice, resendIn, send, confirm, cancel } = phone;
  const otherChannel = channel === 'sms' ? 'whatsapp' : 'sms';

  return (
    <Card style={style}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon name="phone" size={ms(18)} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="caption">{t('profile.info.mobile')}</AppText>
          <AppText variant="label" color={colors.heading} numberOfLines={1}>
            {mobile}
          </AppText>
        </View>
        <Badge
          label={t(verified ? 'profile.mobile.verified' : 'profile.mobile.unverified')}
          tone={verified ? 'success' : 'warning'}
          size="sm"
        />
      </View>

      {!verified && step === 'code' ? (
        <FadeIn offset={0}>
          <AppText variant="caption" color={colors.body} style={styles.hint}>
            {t(channel === 'sms' ? 'profile.mobile.sentSms' : 'profile.mobile.sentWhatsapp', { phone: mobile })}
          </AppText>
          <OTPInput length={CODE_LENGTH} value={code} onChangeText={setCode} style={styles.code} />
          <ButtonRow style={styles.actions}>
            <Button
              title={t('common.cancel')}
              variant="outline"
              size="sm"
              fullWidth={false}
              disabled={busy === 'confirm'}
              onPress={cancel}
              style={styles.flex}
            />
            <Button
              title={t('profile.mobile.confirm')}
              size="sm"
              fullWidth={false}
              loading={busy === 'confirm'}
              onPress={confirm}
              style={styles.flex}
            />
          </ButtonRow>
          <View style={styles.links}>
            {resendIn > 0 ? (
              <AppText variant="caption" color={colors.body}>
                {t('auth.forgot.resendIn', { seconds: resendIn })}
              </AppText>
            ) : (
              <Pressable onPress={() => send(channel)} disabled={!!busy} accessibilityRole="button" hitSlop={ms(6)}>
                <AppText variant="label" color={busy ? colors.placeholder : colors.primary}>
                  {t('auth.forgot.resend')}
                </AppText>
              </Pressable>
            )}
            <Pressable onPress={() => send(otherChannel)} disabled={!!busy || resendIn > 0} accessibilityRole="button" hitSlop={ms(6)}>
              <AppText variant="label" color={busy || resendIn > 0 ? colors.placeholder : colors.primary}>
                {t(otherChannel === 'sms' ? 'profile.mobile.useSms' : 'profile.mobile.useWhatsapp')}
              </AppText>
            </Pressable>
          </View>
        </FadeIn>
      ) : null}

      {!verified && step === 'idle' ? (
        <>
          <AppText variant="caption" color={colors.body} style={styles.hint}>
            {t('profile.mobile.unverifiedNote')}
          </AppText>
          <View style={styles.links}>
            <Pressable onPress={() => send('whatsapp')} disabled={!!busy} accessibilityRole="button" hitSlop={ms(6)}>
              <AppText variant="label" color={busy ? colors.placeholder : colors.primary}>
                {t(busy === 'send' ? 'profile.mobile.sending' : 'profile.mobile.verifyWhatsapp')}
              </AppText>
            </Pressable>
            <Pressable onPress={() => send('sms')} disabled={!!busy} accessibilityRole="button" hitSlop={ms(6)}>
              <AppText variant="label" color={busy ? colors.placeholder : colors.primary}>
                {t('profile.mobile.useSms')}
              </AppText>
            </Pressable>
          </View>
        </>
      ) : null}

      {notice ? (
        <FadeIn offset={0} style={styles.notice}>
          <Icon name="check" size={ms(14)} color={colors.success} strokeWidth={3} />
          <AppText variant="caption" color={colors.heading} style={styles.flex}>
            {notice}
          </AppText>
        </FadeIn>
      ) : null}
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.hint}>
          {error}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  flex: {
    flex: 1,
  },
  hint: {
    marginTop: spacing.md,
  },
  code: {
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.md,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.xl,
    rowGap: spacing.sm,
    marginTop: spacing.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
  },
});

export default MobileCard;
