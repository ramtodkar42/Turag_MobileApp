import { StyleSheet, View } from 'react-native';
import { Button } from '../../../../components';
import { spacing } from '../../../../theme';

// Tappable answers above the chat's input. options: [{ key, label, onPress,
// primary?, loading? }]. Two or three share a row; more wrap.
function QuickReplies({ options, style }) {
  return (
    <View style={[styles.row, style]}>
      {options.map(option => (
        <Button
          key={option.key}
          title={option.label}
          size="md"
          variant={option.primary ? 'primary' : 'outline'}
          onPress={option.onPress}
          loading={option.loading}
          style={[styles.option, options.length > 3 && styles.small]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingHorizontal: spacing.sm,
  },
  small: {
    flexBasis: '20%',
  },
});

export default QuickReplies;
