import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Card, Icon } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { WEBSITE_URL } from '../../../../api/config';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// The report's authenticity line (as the web report's "To verify the
// authenticity of this report, visit … (certificate …)"): the public check
// page, which opens in the browser, and the certificate number.
// token: report.verificationToken (nothing is shown without one).
function VerifyReportCard({ token, style }) {
  const t = useT();
  if (!token) {
    return null;
  }
  const url = `${WEBSITE_URL}/verify/${token}`;
  const shown = url.replace(/^https?:\/\//, '');
  return (
    <Card style={style}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon name="shieldCheck" size={ms(18)} color={colors.success} strokeWidth={2} />
        </View>
        <View style={styles.flex}>
          <AppText variant="title" style={styles.title}>
            {t('account.report.verify.title')}
          </AppText>
          <AppText variant="caption" style={styles.text}>
            {t('account.report.verify.text')}
          </AppText>
          <Pressable
            onPress={() => Linking.openURL(url).catch(() => {})}
            accessibilityRole="link"
            accessibilityLabel={t('account.report.verify.open')}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <AppText color={colors.primary} numberOfLines={2} style={styles.url}>
              {shown}
            </AppText>
            <Icon name="arrowUpRight" size={ms(14)} color={colors.primary} strokeWidth={2} />
          </Pressable>
          <AppText variant="caption" style={styles.cert}>
            {t('account.report.verify.certificate', { id: token })}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const ICON = ms(36);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successLight,
  },
  flex: {
    flex: 1,
  },
  title: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  text: {
    marginTop: spacing.xxs,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.input,
  },
  pressed: {
    opacity: 0.7,
  },
  url: {
    flexShrink: 1,
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  cert: {
    marginTop: spacing.xs,
    fontSize: fs(11),
    lineHeight: fs(15),
  },
});

export default VerifyReportCard;
