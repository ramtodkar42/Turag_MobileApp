import { useT } from '../../../i18n';
import ChatScreen from './ChatScreen';
import useBookingChat from './useBookingChat';

// Chat about a booking: the customer with their inspector (booking page), or
// the inspector with the customer (job page, withCustomer). The screen itself is
// the shared ChatScreen.
// params: { bookingId, withCustomer? }
function BookingChat({ navigation, route }) {
  const t = useT();
  const { bookingId, withCustomer = false } = route.params;
  const chat = useBookingChat(bookingId);
  return (
    <ChatScreen
      title={t(withCustomer ? 'inspector.chat.title' : 'account.chat.title')}
      onBack={navigation.goBack}
      chat={chat}
      emptyTitle={t('account.chat.emptyTitle')}
      emptyMessage={t(withCustomer ? 'inspector.chat.emptyMessage' : 'account.chat.emptyMessage')}
    />
  );
}

export default BookingChat;
