import { useT } from '../../../i18n';
import ChatScreen from '../../account/BookingChat/ChatScreen';
import useOrderChat from './useOrderChat';

// The buyer-seller chat on an order (the web's OrderChat, ADR-0096): the only way the
// two contact each other on Turag, to agree the handover time and place. Opens once
// the token is paid; read-only once the order is completed or cancelled. Phone numbers
// can't be shared (the server refuses them).
// params: { orderId, role: 'BUYER' | 'SELLER' }
function OrderChat({ navigation, route }) {
  const t = useT();
  const { orderId, role } = route.params;
  const chat = useOrderChat(orderId);
  // Before the first answer the box shows (sending waits for the load anyway).
  const open = chat.access === undefined || chat.access === 'OPEN';
  return (
    <ChatScreen
      title={t(role === 'SELLER' ? 'orderChat.titleSeller' : 'orderChat.titleBuyer')}
      onBack={navigation.goBack}
      chat={chat}
      notice={open ? t('orderChat.intro') : null}
      emptyTitle={t('account.chat.emptyTitle')}
      emptyMessage={t('orderChat.empty')}
      canWrite={open}
      closedNote={t(chat.access === 'READ_ONLY' ? 'orderChat.readOnly' : 'orderChat.notOpen')}
    />
  );
}

export default OrderChat;
