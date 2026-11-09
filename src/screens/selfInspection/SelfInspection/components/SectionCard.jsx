import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';

// A step's section: its title with how far it is on the right (e.g. StatusPill), an
// optional line of help, then its content - in a light card (a thin border, no
// shadow). plain: no card around it, for a section whose items are cards themselves
// (never a card inside a card).
function SectionCard({ title, subtitle, right, plain = false, children, style }) {
  return (
    <View style={[plain ? styles.plain : styles.card, style]}>
      {title ? (
        <View style={styles.head}>
          <View style={styles.flex}>
            <AppText style={styles.title}>{title}</AppText>
            {subtitle ? (
              <AppText variant="caption" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  plain: {
    gap: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.title.semiBold,
    fontSize: fs(17),
    lineHeight: fs(23),
    color: colors.heading,
  },
  subtitle: {
    marginTop: spacing.xxs,
  },
});

export default SectionCard;
