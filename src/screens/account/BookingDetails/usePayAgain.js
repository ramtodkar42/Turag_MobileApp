import { useRef, useState } from 'react';
import { PAYMENT_CANCELLED, PAYMENT_UNAVAILABLE, payForBooking } from '../../../api/services/booking.api';
import { refreshNotifications } from '../../../store/notificationStore';
import { tNow } from '../../../i18n';
import { paymentPrefill } from '../../booking/paymentPrefill';

// "Pay now" on a booking whose fee isn't paid yet (as the web's booking page):
// opens the payment window right here, then reloads the booking once the
// server confirms it (onPaid). Safe to tap again after a failure (the backend
// reuses the same payment order).
// Returns { pay, busy, note ({ text, tone: 'info' | 'error' } | null), failed }.
export default function usePayAgain({ booking, onPaid }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [failed, setFailed] = useState(false);
  const sending = useRef(false);

  const pay = async () => {
    if (!booking || sending.current) return;
    sending.current = true;
    setBusy(true);
    setNote(null);
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
        setNote({ text: tNow('account.booking.pay.awaiting'), tone: 'info' });
      }
    } catch (e) {
      setFailed(true);
      setNote({
        text:
          e?.code === PAYMENT_CANCELLED || e?.code === PAYMENT_UNAVAILABLE
            ? e.message
            : tNow('booking.summary.payError'),
        tone: 'error',
      });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  return { pay, busy, note, failed };
}
