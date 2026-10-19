import { useCallback, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { FadeIn, ScreenContainer } from '../../../components';
import { spacing } from '../../../theme';
import { pickImageFromGallery } from '../../../utils/pickImage';
import BotMessage from './components/BotMessage';
import ChatHeader from './components/ChatHeader';
import ChatInput from './components/ChatInput';
import ChatWelcome from './components/ChatWelcome';
import TypingIndicator from './components/TypingIndicator';
import UserMessage from './components/UserMessage';
import useChat from './useChat';

// TURAG.AI assistant. The list is inverted so new messages appear at the bottom
// and it stays scrolled to the latest one.
function Chat({ navigation }) {
  const { messages, typing, send } = useChat();
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);

  const onSend = () => {
    send({ text, image: attachment?.uri });
    setText('');
    setAttachment(null);
  };

  const onAttach = async () => {
    try {
      const photo = await pickImageFromGallery();
      if (photo) {
        setAttachment(photo);
      }
    } catch {
      // Gallery unavailable - nothing to attach.
    }
  };

  const renderItem = useCallback(
    ({ item }) => (
      <FadeIn>
        {item.role === 'user' ? (
          <UserMessage message={item} />
        ) : (
          <BotMessage message={item} />
        )}
      </FadeIn>
    ),
    [],
  );

  return (
    <ScreenContainer
      padded={false}
      header={<ChatHeader onBack={navigation.goBack} />}
      footer={
        <ChatInput
          value={text}
          onChangeText={setText}
          attachment={attachment}
          onAttach={onAttach}
          onRemoveAttachment={() => setAttachment(null)}
          onSend={onSend}
        />
      }
    >
      {messages.length === 0 && !typing ? (
        <ChatWelcome onSelect={value => send({ text: value })} />
      ) : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={typing ? <TypingIndicator /> : null}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
});

export default Chat;
