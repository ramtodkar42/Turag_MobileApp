import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, CheckCircle } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';

// One language in the list: its own name ("मराठी") with the English name
// below ("Marathi"), and a tick when it's the app language.
// language: { code, name, nativeName }
function LanguageOption({ language, selected, showDivider, selectedLabel, onPress }) {
  const sameName = language.nativeName === language.name;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={sameName ? language.name : `${language.nativeName}, ${language.name}`}
      style={({ pressed }) => [styles.row, showDivider && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <AppText variant="title" color={selected ? colors.primary : colors.heading}>
          {language.nativeName}
        </AppText>
        {sameName ? null : <AppText variant="caption">{language.name}</AppText>}
      </View>
      {selected ? (
        <CheckCircle size={ms(22)} color={colors.primary} accessibilityLabel={selectedLabel} />
      ) : (
        <View style={styles.radio} />
      )}
    </Pressable>
  );
}

const RADIO = ms(22);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: ms(64),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.input,
  },
  text: {
    flex: 1,
  },
  radio: {
    width: RADIO,
    height: RADIO,
    borderRadius: RADIO / 2,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});

export default LanguageOption;
