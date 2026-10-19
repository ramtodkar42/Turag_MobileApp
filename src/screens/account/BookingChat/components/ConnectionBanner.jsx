import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Slim notice above the conversation when new messages can't be fetched
// (the messages already shown stay). Retries by itself; "Try again" retries now.
function ConnectionBanner({ retrying, onRetry }) {
  const t = useT();
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <AppText variant="caption" color={colors.body} style={styles.text}>
        {t('account.chat.reconnecting')}
      </AppText>
      {retrying ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
          <AppText variant="label" color={colors.primary} style={styles.action}>
            {t('common.retry')}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
  },
  text: {
    flex: 1,
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  action: {
    fontSize: fs(12),
  },
});

export default ConnectionBanner;
