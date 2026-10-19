import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import MessageBubble from './MessageBubble';

// Right-aligned red bubble.
function UserMessage({ message }) {
  return (
    <View style={styles.row}>
      <MessageBubble tone="user" text={message.text} image={message.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
  },
});

export default memo(UserMessage);
