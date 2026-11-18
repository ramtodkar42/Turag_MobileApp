import { useMemo } from 'react';
import { getBookingMessages, sendBookingMessage } from '../../../api/services/booking.api';
import useChatThread from '../../../hooks/useChatThread';

// Chat about a booking (the customer with their inspector). The shared chat logic
// (polling, sending, retrying) is in hooks/useChatThread.
// Returns { messages, loading, error, retrying, retry(), send(text), resend(message) }.
export default function useBookingChat(bookingId) {
  const transport = useMemo(
    () => ({
      load: async () => ({ messages: await getBookingMessages(bookingId) }),
      send: text => sendBookingMessage(bookingId, text),
    }),
    [bookingId],
  );
  const { messages, loading, error, retrying, retry, send, resend } = useChatThread(bookingId, transport);
  return { messages, loading, error, retrying, retry, send, resend };
}
