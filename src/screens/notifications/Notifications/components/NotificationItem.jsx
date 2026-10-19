import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// One notification: round icon, title + time, message. While unread (as on
// the web): a light red background, a red dot and a bolder title.
// onPress (optional): the notification opens a page (its link has one in the app).
// item: { icon, title, body, time, unread }
function NotificationItem({ item, onPress }) {
  const t = useT();
  const Root = onPress ? Pressable : View;
  const rowStyle = [styles.row, item.unread && styles.rowUnread];
  return (
    <Root
      onPress={onPress}
      style={onPress ? ({ pressed }) => [rowStyle, pressed && styles.rowPressed] : rowStyle}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${item.unread ? `${t('notifications.unread')} ` : ''}${item.title}. ${item.body}. ${item.time}`}
    >
      <View style={styles.iconWrap}>
        <Icon name={item.icon} size={ms(20)} color={colors.primary} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <AppText
            variant="label"
            color={colors.heading}
            numberOfLines={2}
            style={[styles.title, item.unread && styles.titleUnread]}
          >
            {item.title}
          </AppText>
          <AppText variant="caption">{item.time}</AppText>
          {item.unread ? <View style={styles.dot} /> : null}
        </View>
        {item.body ? (
          <AppText variant="caption" color={colors.body} style={styles.body}>
            {item.body}
          </AppText>
        ) : null}
      </View>
    </Root>
  );
}

const ICON = ms(42);
const DOT = ms(8);

const styles = StyleSheet.create({
  // Full width (past the screen padding), so the unread background reaches
  // both edges.
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowUnread: {
    backgroundColor: colors.unreadTint,
  },
  rowPressed: {
    backgroundColor: colors.input,
  },
  iconWrap: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  titleUnread: {
    fontFamily: fonts.subtitle.bold,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.primary,
  },
  body: {
    marginTop: spacing.xxs,
  },
});

export default memo(NotificationItem);
