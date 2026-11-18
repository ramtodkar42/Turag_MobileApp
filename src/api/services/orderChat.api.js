import { request } from '../client';
import { ENDPOINTS } from '../endpoints';
import { mapBookingMessage } from '../mappers/booking';

// The buyer-seller chat on an order (the web's ADR-0096): the only way the two contact
// each other on Turag. The server decides everything: who may read it, whether it's
// open, and it refuses phone numbers (ORDER_MESSAGE_PHONE_NUMBER).
// A message is shaped like the booking chat's: { id, text, mine, createdAt }.

// access: 'NOT_OPEN' before the token is paid, 'OPEN' from token paid through handover,
// 'READ_ONLY' once the order is completed or cancelled.
export const ORDER_CHAT_PHONE_NUMBER = 'ORDER_MESSAGE_PHONE_NUMBER';
export const ORDER_CHAT_CLOSED = 'ORDER_CHAT_CLOSED';

// Returns { messages (oldest first), access }.
export const getOrderMessages = async orderId => {
  const data = await request(ENDPOINTS.orderMessages(orderId));
  return { messages: (data.messages ?? []).map(mapBookingMessage), access: data.chat ?? 'NOT_OPEN' };
};

// Sends one message (1 to 2000 characters). Returns the saved message.
export const sendOrderMessage = async (orderId, text) => {
  const data = await request(ENDPOINTS.orderMessages(orderId), { method: 'POST', body: { body: text.trim() } });
  return mapBookingMessage(data.message);
};
