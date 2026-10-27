import { Pressable, StyleSheet } from 'react-native';
import { AppText, CheckCircle, Icon, PopIn } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// One row of the location sheet (same look as OptionSheet's): a label, and a
// check when chosen or an arrow when it opens a next step.
// soon: a city Turag doesn't serve yet - faded; tapping it shows "Coming soon"
// (soonShown) instead of choosing it (as the web's picker).
function LocationRow({ label, selected, next, soon, soonShown, onPress }) {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={next ? 'button' : 'radio'}
      accessibilityState={{ selected: !!selected, disabled: !!soon }}
      accessibilityHint={soon ? t('location.comingSoon') : undefined}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        soon && styles.rowSoon,
        pressed && styles.pressed,
      ]}
    >
      <AppText
        variant="body"
        color={soon ? colors.placeholder : colors.heading}
        numberOfLines={1}
        style={styles.text}
      >
        {label}
      </AppText>
      {soon && soonShown ? (
        <PopIn style={styles.tag}>
          <AppText variant="caption" color={colors.primary} style={styles.tagText}>
            {t('location.comingSoon')}
          </AppText>
        </PopIn>
      ) : null}
      {selected ? <CheckCircle size={ms(20)} /> : null}
      {next && !selected ? <Icon name="chevronRight" size={ms(16)} color={colors.placeholder} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: ms(48),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  rowSelected: {
    borderColor: colors.success,
  },
  rowSoon: {
    borderStyle: 'dashed',
    backgroundColor: colors.input,
  },
  text: {
    flex: 1,
  },
  pressed: {
    backgroundColor: colors.input,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: ms(2),
    borderRadius: radius.pill,
    backgroundColor: colors.dangerLight,
  },
  tagText: {
    fontSize: fs(11),
    lineHeight: fs(14),
  },
});

export default LocationRow;
