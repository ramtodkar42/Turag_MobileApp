import { useMemo } from 'react';
import {
  ORDER_CHAT_CLOSED,
  ORDER_CHAT_PHONE_NUMBER,
  getOrderMessages,
  sendOrderMessage,
} from '../../../api/services/orderChat.api';
import useChatThread from '../../../hooks/useChatThread';
import { tNow } from '../../../i18n';

// The buyer-seller chat on an order (the web's ADR-0096), on the shared chat logic
// (hooks/useChatThread). A message with a phone number, or one sent just as the
// chat closed, is refused for good: its text goes back to the box with the reason.
// Returns the useChatThread result; access: 'NOT_OPEN' | 'OPEN' | 'READ_ONLY'.
export default function useOrderChat(orderId) {
  const transport = useMemo(
    () => ({
      load: () => getOrderMessages(orderId),
      send: text => sendOrderMessage(orderId, text),
      refuse: e => {
        if (e?.code === ORDER_CHAT_PHONE_NUMBER) return tNow('orderChat.notice');
        if (e?.code === ORDER_CHAT_CLOSED) return tNow('orderChat.readOnly');
        return null;
      },
    }),
    [orderId],
  );
  return useChatThread(orderId, transport);
}
