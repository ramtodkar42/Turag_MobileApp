import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Icon from '../icons/Icon';
import { colors, radius, spacing } from '../../theme';
import { ms } from '../../utils/responsive';

// Square checkbox + text, e.g. consent rows. `label` can be a string or
// AppText children with links (nested <AppText onPress>).
function CheckRow({ label, checked = false, onToggle, style }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.row, style]}
    >
      <View style={[styles.box, checked && styles.checked]}>
        {checked ? <Icon name="check" size={ms(13)} color={colors.white} strokeWidth={3} /> : null}
      </View>
      <AppText variant="caption" color={colors.body} style={styles.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const BOX = ms(20);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  box: {
    width: BOX,
    height: BOX,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm / 2,
    backgroundColor: colors.white,
  },
  checked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  text: {
    flex: 1,
  },
});

export default CheckRow;
