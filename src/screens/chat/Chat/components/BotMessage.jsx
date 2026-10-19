import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '../../../../theme';
import BotAvatar from './BotAvatar';
import CopyButton from './CopyButton';
import MessageBubble from './MessageBubble';

// Left-aligned grey bubble, TURAG.AI avatar underneath, copy icon on the right.
function BotMessage({ message }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.bubble}>
          <MessageBubble tone="bot" text={message.text} image={message.image} />
        </View>
        {message.text ? <CopyButton text={message.text} /> : null}
      </View>
      <BotAvatar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
  },
  bubble: {
    flexShrink: 1,
  },
});

export default memo(BotMessage);
