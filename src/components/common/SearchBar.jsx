import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

function SearchBar({ value, onChangeText, placeholder: placeholderProp, left, right, style, ...rest }) {
  const t = useT();
  const placeholder = placeholderProp ?? t('common.search');
  return (
    <View style={[styles.container, style]}>
      {left}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        returnKeyType="search"
        maxFontSizeMultiplier={1.3}
        style={styles.input}
        {...rest}
      />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: ms(42),
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.input,
  },
  input: {
    ...typography.subtitle,
    flex: 1,
    color: colors.heading,
    paddingVertical: 0,
  },
});

export default SearchBar;
