import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, CheckCircle } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// The inspection at a glance, kept compact so each step starts high on the screen:
// which vehicle, whose word it is (self-declared / a Turag inspector), the live
// estimate (a tap opens the Estimate step), and one progress bar with how much is
// done - and, for the owner, that it saves as they go.
// name: the vehicle's display name. badge: the self-declared / inspector label.
// live: the estimate, formatted (or null). saved: the "saved" line (owner only).
function InspectionSummary({ name, year, badge, done, total, live, onLivePress, saved, style }) {
  const t = useT();
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        <View style={styles.flex}>
          {name ? (
            <AppText numberOfLines={2} style={styles.name}>
              {name}
            </AppText>
          ) : null}
          <View style={styles.meta}>
            {year ? <AppText variant="caption">{year}</AppText> : null}
            <Badge size="sm" tone="neutral" label={badge} />
          </View>
        </View>
        {live ? (
          <Pressable onPress={onLivePress} accessibilityRole="button" hitSlop={8} style={styles.live}>
            <AppText numberOfLines={1} style={styles.liveValue}>
              {live}
            </AppText>
            <AppText variant="caption">{t('selfInspection.liveEstimate')}</AppText>
          </Pressable>
        ) : null}
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
      >
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>

      <View style={styles.bottom}>
        <AppText variant="caption" color={colors.body} style={styles.flex}>
          {`${percent}% · ${t('selfInspection.doneShort', { done, total })}`}
        </AppText>
        {saved ? (
          <View style={styles.saved}>
            <CheckCircle size={ms(13)} />
            <AppText variant="caption" color={colors.success}>
              {saved}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const BAR = ms(6);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.title.semiBold,
    fontSize: fs(16),
    lineHeight: fs(21),
    color: colors.heading,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  live: {
    alignItems: 'flex-end',
  },
  liveValue: {
    fontFamily: fonts.title.bold,
    fontSize: fs(17),
    lineHeight: fs(22),
    color: colors.success,
  },
  track: {
    height: BAR,
    borderRadius: BAR / 2,
    overflow: 'hidden',
    backgroundColor: colors.dangerLight,
  },
  fill: {
    height: BAR,
    borderRadius: BAR / 2,
    backgroundColor: colors.primary,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});

export default InspectionSummary;
