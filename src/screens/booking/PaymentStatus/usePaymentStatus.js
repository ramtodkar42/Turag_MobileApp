import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { getMyBooking, payForBooking } from '../../../api/services/booking.api';
import { PAYMENT_CANCELLED, paymentProblem } from '../../../api/razorpay';
import { forgetUnpaidBooking } from '../BookingSummary/usePayBooking';
import { ROUTES } from '../../../navigation/routes';
import { currentHomeRoute } from '../../../navigation/homeRoute';
import { refreshNotifications } from '../../../store/notificationStore';
import { tNow } from '../../../i18n';
import { paymentPrefill } from '../paymentPrefill';

// Pays the booking's fee once, then opens "Booking confirmed" (Back from there
// goes Home). On failure it goes back to the booking summary with the error.
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
          amountMinor:
            booking.price != null ? Math.round(booking.price * 100) : undefined,
          label: tNow('booking.summary.payDescription'),
          prefill: paymentPrefill(),
        }));
      } catch (e) {
        // Back to the summary with what happened ({ kind, message }), shown
        // there as a calm PaymentNotice card. Paying again reuses this booking -
        // unless the server refused it (not the payer's cancel / bank decline),
        // then the next Pay makes a fresh one.
        if (e?.code !== PAYMENT_CANCELLED) forgetUnpaidBooking();
        navigation.popTo(ROUTES.BOOKING_SUMMARY, { payError: paymentProblem(e) }, { merge: true });
        return;
      }
      // Left this screen with a booking that's paid or being confirmed.
      forgetUnpaidBooking();
      // Only the server confirms payment (the verified webhook). If it hasn't yet
      // (webhook delayed / not reachable), don't claim "confirmed": open the
      // booking, which shows its real status from the server - and, while it's
      // still unpaid (the backend doesn't list those), this booking with "Pay now".
      const paid = confirmed
        ? await getMyBooking(booking.id).catch(() => null)
        : null;
      if (!paid?.feePaid) {
        navigation.reset({
          index: 1,
          routes: [
            { name: currentHomeRoute() },
            {
              name: ROUTES.BOOKING_DETAILS,
              // paymentPending: say "confirming your payment" there (and keep
              // checking), so nobody thinks it failed and pays again.
              params: { bookingId: booking.id, booking, paymentPending: true },
            },
          ],
        });
        return;
      }
      // The backend just raised the "booking confirmed" notification: pull it in
      // now so its banner pops, instead of waiting for the next quiet poll.
      refreshNotifications();
      navigation.reset({
        index: 1,
        routes: [
          { name: currentHomeRoute() },
          { name: ROUTES.BOOKING_CONFIRMED, params: { booking: paid } },
        ],
      });
    })();
  }, [booking, navigation]);
}
