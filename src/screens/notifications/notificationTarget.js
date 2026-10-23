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
];

// link -> { route, params } or null.
export default function notificationTarget(link) {
  if (!link) {
    return null;
  }
  const path = String(link).replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0];
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
