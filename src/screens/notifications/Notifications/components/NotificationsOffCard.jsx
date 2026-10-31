import { Linking, StyleSheet, View } from 'react-native';
import { AppText, Button, IconTile } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// "Notifications are off" on the Notifications screen, with Turn on (opens
// the phone's Settings for Turag). Shown only while they're off.
function NotificationsOffCard({ style }) {
  const t = useT();
  return (
    <View style={[styles.card, style]}>
      <IconTile name="bell" size={ms(40)} />
      <View style={styles.text}>
        <AppText variant="subtitle" color={colors.heading} style={styles.title}>
          {t('notifications.off.title')}
        </AppText>
        <AppText variant="caption">{t('notifications.off.message')}</AppText>
      </View>
      <Button
        title={t('notifications.off.turnOn')}
        size="sm"
        onPress={() => Linking.openSettings().catch(() => {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  text: {
    flex: 1,
    gap: ms(2),
  },
  title: {
    fontFamily: fonts.title.semiBold,
  },
});

export default NotificationsOffCard;
