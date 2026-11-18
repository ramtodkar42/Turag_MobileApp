import { ROUTES } from '../../navigation/routes';

// A notification's link is a web path (the backend serves the web app too).
// These are the ones the app has a page for; anything else isn't tappable.
const TARGETS = [
  // booking_confirmed / booking_assigned / report_ready
  { pattern: /^\/account\/bookings\/([^/?#]+)\/?$/, route: ROUTES.BOOKING_DETAILS, param: 'bookingId' },
  // offer_countered / offer_accepted / offer_declined / order_* (buyer)
  { pattern: /^\/buy\/offers\/?$/, route: ROUTES.MY_OFFERS },
  // One offer (the web's /buy/offers/{id})
  { pattern: /^\/buy\/offers\/([^/?#]+)\/?$/, route: ROUTES.OFFER_DETAILS, param: 'offerId' },
  // offer_received / offer_withdrawn / ... (seller)
  { pattern: /^\/sell\/([^/?#]+)\/?$/, route: ROUTES.MY_LISTING, param: 'listingId' },
  // booking_assigned / booking_cancelled (the inspector's copy)
  { pattern: /^\/ops\/bookings\/([^/?#]+)\/?$/, route: ROUTES.JOB_DETAILS, param: 'bookingId' },
  // kyc_approved / kyc_rejected: the identity check's result (manual review or DigiLocker)
  { pattern: /^\/account\/verification\/?$/, route: ROUTES.IDENTITY_VERIFICATION },
];

// Just the path: no site, query or #fragment.
const pathOf = link => String(link).replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0];

// link -> { route, params } or null.
export default function notificationTarget(link) {
  if (!link) {
    return null;
  }
  const path = pathOf(link);
  for (const target of TARGETS) {
    const match = path.match(target.pattern);
    if (match) {
      return {
        route: target.route,
        params: target.param ? { [target.param]: decodeURIComponent(match[1]) } : {},
      };
    }
  }
  return null;
}

// A new message in an order's buyer-seller chat (ADR-0096): the first of a turn, or
// one more in the same burst.
const CHAT_TYPES = ['order_message', 'order_message_followup'];
export const isChatNotification = type => CHAT_TYPES.includes(type);

// A push's data { type, entity_type, entity_id, link } -> { route, params } or null.
// A chat message opens its chat: the push names the order, and its link says whose
// side it is (/sell/{listing} for the seller, /buy/offers for the buyer). Anything
// else, or a chat push without the order, opens its link's page as in the list.
export const pushTarget = data => {
  if (isChatNotification(data?.type) && data.entity_type === 'order' && data.entity_id && data.link) {
    const path = pathOf(data.link);
    let role = null;
    if (path.startsWith('/sell/')) {
      role = 'SELLER';
    } else if (path.startsWith('/buy/')) {
      role = 'BUYER';
    }
    if (role) {
      return { route: ROUTES.ORDER_CHAT, params: { orderId: data.entity_id, role } };
    }
  }
  return notificationTarget(data?.link);
};
