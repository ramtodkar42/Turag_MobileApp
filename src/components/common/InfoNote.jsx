import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { colors, spacing } from '../../theme';
import { ms } from '../../utils/responsive';

// Small "ⓘ note" text under forms and cards.
function InfoNote({ children, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.icon}>
        <AppText variant="caption" color={colors.placeholder} style={styles.i}>
          i
        </AppText>
      </View>
      <AppText variant="caption" style={styles.text}>
        {children}
      </AppText>
    </View>
  );
}

const ICON = ms(12);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  icon: {
    width: ICON,
    height: ICON,
    marginTop: ms(1.5),
    borderRadius: ICON / 2,
    borderWidth: 1,
    borderColor: colors.placeholder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  i: {
    fontSize: ICON * 0.7,
    lineHeight: ICON * 0.8,
  },
  text: {
    flex: 1,
  },
});

export default InfoNote;
