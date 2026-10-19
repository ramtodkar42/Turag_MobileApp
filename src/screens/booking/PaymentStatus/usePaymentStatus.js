import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import {
  PAYMENT_CANCELLED,
  PAYMENT_UNAVAILABLE,
  getMyBooking,
  payForBooking,
} from '../../../api/services/booking.api';
import { ROUTES } from '../../../navigation/routes';
import { currentHomeRoute } from '../../../navigation/homeRoute';
import { refreshNotifications } from '../../../store/notificationStore';
import { tNow } from '../../../i18n';

// Pays the booking's fee once, then opens "Booking confirmed" (Back from there
// goes Home). On failure it goes back to the payment screen with the error.
// Android back is ignored meanwhile (iOS swipe-back is off for this screen).
export default function usePaymentStatus({ navigation, booking }) {
  const started = useRef(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    (async () => {
      let confirmed = false;
      try {
        ({ confirmed } = await payForBooking(booking.id, {
          amountMinor: booking.price != null ? Math.round(booking.price * 100) : undefined,
          label: tNow('booking.summary.payDescription'),
        }));
      } catch (e) {
        // The user's own cancel / an unavailable gateway carries a clear message;
        // anything else is a generic failure.
        const payError =
          e.code === PAYMENT_UNAVAILABLE || e.code === PAYMENT_CANCELLED
            ? e.message
            : tNow('booking.summary.payError');
        navigation.popTo(ROUTES.BOOKING_PAYMENT, { payError }, { merge: true });
        return;
      }
      // Only the server confirms payment (the verified webhook). If it hasn't yet
      // (webhook delayed / not reachable), don't claim "confirmed": open the
      // booking, which shows its real status from the server.
      const paid = confirmed ? await getMyBooking(booking.id).catch(() => null) : null;
      if (!paid?.feePaid) {
        navigation.reset({
          index: 1,
          routes: [{ name: currentHomeRoute() }, { name: ROUTES.BOOKING_DETAILS, params: { bookingId: booking.id } }],
        });
        return;
      }
      // The backend just raised the "booking confirmed" notification: pull it in
      // now so its banner pops, instead of waiting for the next quiet poll.
      refreshNotifications();
      navigation.reset({
        index: 1,
        routes: [{ name: currentHomeRoute() }, { name: ROUTES.BOOKING_CONFIRMED, params: { booking: paid } }],
      });
    })();
  }, [booking, navigation]);
}
