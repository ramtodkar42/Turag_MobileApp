import { useCallback, useEffect, useMemo } from 'react';
import { FlatList, Keyboard, StyleSheet } from 'react-native';
import { Button, ScreenContainer } from '../../../components';
import { spacing } from '../../../theme';
import { useT } from '../../../i18n';
import ChatHeader from '../../chat/Chat/components/ChatHeader';
import TypingIndicator from '../../chat/Chat/components/TypingIndicator';
import ChatItem from './components/ChatItem';
import EvaluateFooter from './components/EvaluateFooter';
import useEvaluateChat from './useEvaluateChat';
import { STEPS } from './steps';

// Steps answered by typing (the keyboard may stay open).
const TYPED_STEPS = new Set([STEPS.REG, STEPS.KM, STEPS.OWNERS]);

// Evaluate (the Evaluate tab): TURAG.AI asks the same questions as the web's
// /evaluate and shows the same results, one message at a time - registration
// number, "Is this your vehicle?", the estimates, then Save Vehicle / Inspect
// Vehicle and Self Inspection / Appoint an Inspector (see useEvaluateChat).
// The list is inverted, so it stays on the latest message.
function EvaluateChat({ navigation }) {
  const t = useT();
  const chat = useEvaluateChat({ navigation });
  const data = useMemo(() => [...chat.messages].reverse(), [chat.messages]);
  const renderItem = useCallback(({ item }) => <ChatItem message={item} />, []);

  // While TURAG.AI replies, and when the answer is a choice (buttons), the
  // keyboard closes so the whole reply and the choices fit in view.
  useEffect(() => {
    if (!TYPED_STEPS.has(chat.step)) {
      Keyboard.dismiss();
    }
  }, [chat.step]);

  return (
    <ScreenContainer
      padded={false}
      header={
        <ChatHeader
          onBack={navigation.goBack}
          right={
            <Button
              title={t('valuation.chat.startOver')}
              variant="ghost"
              size="sm"
              onPress={chat.restart}
              disabled={chat.messages.length < 3}
            />
          }
        />
      }
      footer={<EvaluateFooter chat={chat} navigation={navigation} />}
    >
      <FlatList
        inverted
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={chat.typing ? <TypingIndicator /> : null}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      />
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

export default EvaluateChat;
