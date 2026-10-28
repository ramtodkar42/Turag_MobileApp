import { useRef, useState } from 'react';
import { payForBooking } from '../../../api/services/booking.api';
import { paymentProblem } from '../../../api/razorpay';
import { refreshNotifications } from '../../../store/notificationStore';
import { tNow } from '../../../i18n';
import { paymentPrefill } from '../../booking/paymentPrefill';

// "Pay now" on a booking whose fee isn't paid yet (as the web's booking page):
// opens the payment window right here, then reloads the booking once the
// server confirms it (onPaid). Safe to tap again after a failure (the backend
// reuses the same payment order).
// Returns { pay, busy, note ({ text } | null: paid, awaiting the server),
// problem ({ kind, message } | null: a payment that didn't finish, shown as a
// PaymentNotice), failed }.
export default function usePayAgain({ booking, onPaid }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [problem, setProblem] = useState(null);
  const [failed, setFailed] = useState(false);
  const sending = useRef(false);

  const pay = async () => {
    if (!booking || sending.current) return;
    sending.current = true;
    setBusy(true);
    setNote(null);
    setProblem(null);
    try {
      const { confirmed } = await payForBooking(booking.id, {
        amountMinor: booking.price != null ? Math.round(booking.price * 100) : undefined,
        label: tNow('booking.summary.payDescription'),
        prefill: paymentPrefill(),
      });
      setFailed(false);
      if (confirmed) {
        refreshNotifications();
        await onPaid?.();
      } else {
        // Paid, but the server hasn't confirmed it yet (its webhook is late).
        setNote({ text: tNow('account.booking.pay.awaiting') });
      }
    } catch (e) {
      setFailed(true);
      setProblem(paymentProblem(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  return { pay, busy, note, problem, failed };
}
