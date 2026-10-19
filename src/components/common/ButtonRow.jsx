import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';

// Two (or more) equal-width buttons side by side, e.g. "Create Listing | Book an Inspector".
function ButtonRow({ children, style }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});

export default ButtonRow;
