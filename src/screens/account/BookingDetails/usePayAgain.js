import { useEffect, useRef, useState } from 'react';
import { payForBooking } from '../../../api/services/booking.api';
import { paymentProblem } from '../../../api/razorpay';
import { refreshNotifications } from '../../../store/notificationStore';
import { tNow } from '../../../i18n';
import { paymentPrefill } from '../../booking/paymentPrefill';

// While a payment waits for the bank's confirmation, the booking is checked
// again quietly every few seconds for a couple of minutes.
const CHECK_EVERY_MS = 5000;
const CHECK_FOR_MS = 120000;

// "Pay now" on a booking whose fee isn't paid yet (as the web's booking page):
// opens the payment window right here, then reloads the booking once the
// server confirms it (onPaid). Safe to tap again after a failure: the backend
// reuses the same payment order, so the same payment can't be taken twice.
// pending: a payment was just made but not confirmed yet (from "Hold on").
// Returns { pay, busy, problem ({ kind, message } | null: shown as a
// PaymentNotice - a payment that didn't finish, or one being confirmed), failed }.
export default function usePayAgain({ booking, onPaid, pending = false }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(() => (pending ? awaitingProblem() : null));
  const [failed, setFailed] = useState(false);
  const sending = useRef(false);
  const awaiting = problem?.kind === 'awaiting';
  const paid = !!booking?.feePaid;
  const check = useRef(onPaid);
  check.current = onPaid;

  // Confirming: keep checking quietly; the panel goes once the booking is paid.
  useEffect(() => {
    if (!awaiting || paid) {
      return undefined;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt > CHECK_FOR_MS) {
        clearInterval(timer);
        return;
      }
      check.current?.();
    }, CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [awaiting, paid]);

  // Paid now: nothing left to say.
  useEffect(() => {
    if (paid) {
      setProblem(null);
    }
  }, [paid]);

  const pay = async () => {
    if (!booking || sending.current) return;
    sending.current = true;
    setBusy(true);
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
        // Not confirmed yet (late webhook, or a payment page closed without
        // paying): say so honestly and keep checking.
        setProblem(awaitingProblem());
      }
    } catch (e) {
      setFailed(true);
      setProblem(paymentProblem(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  return { pay, busy, problem, failed };
}

// "Confirming your payment": if paid, don't pay again; if not, Pay now
// continues the same payment.
function awaitingProblem() {
  return {
    kind: 'awaiting',
    message: tNow('account.booking.pay.awaiting'),
    messageKey: 'account.booking.pay.awaiting',
  };
}
