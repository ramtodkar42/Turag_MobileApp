import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

function Divider({ color = colors.border, spacing = 0, style }) {
  return <View style={[styles.line, { backgroundColor: color, marginVertical: spacing }, style]} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});

export default Divider;
