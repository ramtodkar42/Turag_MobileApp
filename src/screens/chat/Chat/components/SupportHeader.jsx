import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, BackButton, SupportBadge } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// The support chat's one header (the chat page's own bar is hidden, see
// supportPage.js): back, the red life-ring badge, "Turag Support" with
// "Online · replies in minutes", and "New chat" while a chat is going.
function SupportHeader({ onBack, onNewChat }) {
  const t = useT();
  return (
    <View style={styles.container}>
      <BackButton onPress={onBack} />
      <SupportBadge size={ms(40)} />
      <View style={styles.name}>
        <AppText variant="title" numberOfLines={1} accessibilityRole="header" style={styles.title}>
          <AppText variant="title" color={colors.primary} style={styles.title}>
            Turag
          </AppText>{' '}
          {t('chat.support.title')}
        </AppText>
        <View style={styles.status}>
          <View style={styles.dot} />
          <AppText variant="caption" numberOfLines={1} style={styles.statusText}>
            {t('chat.support.online')}
          </AppText>
        </View>
      </View>
      {onNewChat ? (
        <Pressable
          onPress={onNewChat}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          style={({ pressed }) => [styles.newChat, pressed && styles.pressed]}
        >
          <AppText variant="caption" color={colors.body} style={styles.newChatText}>
            {t('chat.support.newChat')}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const DOT = ms(7);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: {
    flex: 1,
  },
  title: {
    fontSize: fs(16),
    lineHeight: fs(21),
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: ms(2),
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.success,
  },
  statusText: {
    flexShrink: 1,
    fontSize: fs(11),
    lineHeight: fs(15),
  },
  newChat: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.input,
  },
  newChatText: {
    fontSize: fs(11.5),
  },
  pressed: {
    opacity: 0.6,
  },
});

export default SupportHeader;
