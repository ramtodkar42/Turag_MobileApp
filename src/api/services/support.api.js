// The support chat (as the web's SupportWidget): Turag's space on the Support
// Engine. Guests get answers from Turag's help articles; for a signed-in user
// the app first gets a short-lived pass from Turag (GET /support-token, only
// ever for the user's own account) so the chat can also answer about their own
// bookings and offers.
import { request } from '../client';
import { SUPPORT_CHAT_URL, USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';
import { hasSession } from '../session';

// The chat page to open. Never fails: without a pass (signed out, the feature
// switched off on the server, or a network blip) it's the help-articles chat.
export const getSupportChatUrl = async () => {
  if (!USE_REAL_API.auth || !hasSession()) {
    return SUPPORT_CHAT_URL;
  }
  try {
    const data = await request(ENDPOINTS.SUPPORT_TOKEN, { timeoutMs: 8000 });
    return data?.token ? `${SUPPORT_CHAT_URL}&st=${encodeURIComponent(data.token)}` : SUPPORT_CHAT_URL;
  } catch {
    return SUPPORT_CHAT_URL;
  }
};
