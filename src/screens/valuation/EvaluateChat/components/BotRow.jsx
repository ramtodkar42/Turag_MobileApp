import { StyleSheet, View } from 'react-native';
import { spacing } from '../../../../theme';
import BotAvatar from '../../../chat/Chat/components/BotAvatar';

// A TURAG.AI message: its bubble or card, with the avatar underneath (as the
// assistant chat). `wide`: a card (vehicle, estimate) that takes most of the width.
function BotRow({ wide = false, children }) {
  return (
    <View style={[styles.row, wide ? styles.wide : styles.narrow]}>
      <View style={styles.content}>{children}</View>
      <BotAvatar />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  narrow: {
    maxWidth: '85%',
  },
  wide: {
    width: '94%',
  },
  content: {
    paddingLeft: spacing.lg,
  },
});

export default BotRow;
