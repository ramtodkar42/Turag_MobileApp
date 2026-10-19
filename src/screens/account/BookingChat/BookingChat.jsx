import { memo, useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Button, FadeIn, Header, Icon, ScreenContainer, StatusView } from '../../../components';
import { colors, fonts, radius, shadows, spacing } from '../../../theme';
import { HIT_SLOP } from '../../../constants/layout';
import { fs, ms } from '../../../utils/responsive';
import { timeAgo } from '../../../utils/date';
import { useT } from '../../../i18n';
import MessageBubble from '../../chat/Chat/components/MessageBubble';
import ChatSkeleton from './components/ChatSkeleton';
import ConnectionBanner from './components/ConnectionBanner';
import useBookingChat from './useBookingChat';

const MAX_LENGTH = 2000; // backend limit

// One message: my messages on the right (red), the inspector's on the left
// (grey), with the time - or "Sending…" / "Not sent · Tap to retry".
const ChatMessage = memo(function ChatMessage({ message, onRetry }) {
  const t = useT();
  let meta = timeAgo(message.createdAt);
  if (message.pending) {
    meta = t('account.chat.sending');
  } else if (message.failed) {
    meta = t('account.chat.failed');
  }
  const body = (
    <View style={[styles.message, message.mine ? styles.mine : styles.theirs]}>
      <MessageBubble tone={message.mine ? 'user' : 'bot'} text={message.text} />
      <AppText
        variant="caption"
        color={message.failed ? colors.danger : undefined}
        style={[styles.meta, message.mine && styles.metaMine]}
      >
        {meta}
      </AppText>
    </View>
  );
  return message.failed ? (
    <Pressable onPress={() => onRetry(message)} accessibilityRole="button">
      {body}
    </Pressable>
  ) : (
    body
  );
});

// Chat about a booking: the customer with their inspector (booking page), or
// the inspector with the customer (job page, withCustomer).
// First load: placeholder bubbles. Can't load: a message with Try again (it
// also keeps retrying by itself). Connection lost later: a slim banner, the
// conversation stays. Sending waits until the chat has loaded once.
// params: { bookingId, withCustomer? }
function BookingChat({ navigation, route }) {
  const t = useT();
  const { bookingId, withCustomer = false } = route.params;
  const chat = useBookingChat(bookingId);
  const [text, setText] = useState('');
  // Nothing to send to until the conversation has loaded once.
  const offline = !!chat.error && chat.messages.length === 0;
  const canSend = text.trim().length > 0 && !chat.loading && !offline;

  const onSend = () => {
    chat.send(text);
    setText('');
  };

  const renderItem = useCallback(
    ({ item }) => (
      <FadeIn offset={ms(6)}>
        <ChatMessage message={item} onRetry={chat.resend} />
      </FadeIn>
    ),
    [chat.resend],
  );

  let body;
  if (chat.loading) {
    body = <ChatSkeleton />;
  } else if (offline) {
    body = (
      <FadeIn offset={0} style={styles.flex}>
        <StatusView
          icon={
            <View style={styles.errorIcon}>
              <Icon name="message" size={ms(26)} color={colors.primary} />
            </View>
          }
          title={t('account.chat.errorTitle')}
          message={`${chat.error} ${t('account.chat.autoRetry')}`}
        >
          <Button
            title={t('common.retry')}
            size="md"
            onPress={chat.retry}
            loading={chat.retrying}
            style={styles.retry}
          />
        </StatusView>
      </FadeIn>
    );
  } else if (chat.messages.length === 0) {
    body = (
      <StatusView
        title={t('account.chat.emptyTitle')}
        message={t(withCustomer ? 'inspector.chat.emptyMessage' : 'account.chat.emptyMessage')}
      />
    );
  } else {
    body = (
      <FlatList
        inverted
        data={chat.messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <ScreenContainer
      padded={false}
      header={
        <Header
          onBack={navigation.goBack}
          title={t(withCustomer ? 'inspector.chat.title' : 'account.chat.title')}
        />
      }
      footer={
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t(offline ? 'account.chat.placeholderOffline' : 'account.chat.placeholder')}
            placeholderTextColor={colors.placeholder}
            multiline
            maxLength={MAX_LENGTH}
            maxFontSizeMultiplier={1.3}
            style={styles.input}
          />
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t('account.chat.send')}
            style={({ pressed }) => [styles.send, !canSend && styles.sendOff, pressed && styles.pressed]}
          >
            <Icon name="arrowUp" size={ms(16)} color={colors.white} strokeWidth={2.4} />
          </Pressable>
        </View>
      }
    >
      {chat.error && !offline ? <ConnectionBanner retrying={chat.retrying} onRetry={chat.retry} /> : null}
      {body}
    </ScreenContainer>
  );
}

const SEND = ms(40);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  errorIcon: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  retry: {
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  message: {
    maxWidth: '80%',
  },
  mine: {
    alignSelf: 'flex-end',
  },
  theirs: {
    alignSelf: 'flex-start',
  },
  meta: {
    marginTop: spacing.xxs,
    fontSize: fs(10.5),
  },
  metaMine: {
    textAlign: 'right',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: SEND,
    maxHeight: ms(110),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    fontFamily: fonts.subtitle.regular,
    fontSize: fs(14),
    color: colors.heading,
    ...shadows.md,
  },
  send: {
    width: SEND,
    height: SEND,
    borderRadius: SEND / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendOff: {
    backgroundColor: colors.placeholder,
  },
  pressed: {
    opacity: 0.8,
  },
});

export default BookingChat;
