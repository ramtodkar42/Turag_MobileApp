import { useCallback, useEffect, useRef, useState } from 'react';
import useRemoteData from '../../../hooks/useRemoteData';
import {
  PAYMENTS_UNAVAILABLE,
  acceptOffer,
  cancelOrder,
  counterOffer,
  getMyOffers,
  getOrder,
  payOrderToken,
  withdrawOffer,
} from '../../../api/services/offer.api';
import { PAYMENT_CANCELLED, PAYMENT_UNAVAILABLE, paymentProblem } from '../../../api/razorpay';
import { getVehicleDetails } from '../../../api/services/vehicle.api';
import { ApiError } from '../../../api/client';
import { refreshNotifications } from '../../../store/notificationStore';
import { tNow } from '../../../i18n';
import { paymentPrefill } from '../../booking/paymentPrefill';

// A token payment waiting for the bank is checked again this often, this long.
const AWAIT_CHECK_EVERY_MS = 5000;
const AWAIT_CHECK_FOR_MS = 120000;

// One of the buyer's offers (as the web's /buy/offers/{id}): there's no
// single-offer endpoint, so it's picked from the buyer's offers (with its
// order); the public listing adds the photo and specs (best effort).
const loadOffer = async offerId => {
  const offer = (await getMyOffers()).find(o => o.id === offerId);
  if (!offer) {
    throw new ApiError({ status: 404, code: 'OFFER_NOT_FOUND', message: tNow('offers.error.notFound') });
  }
  const listing = await getVehicleDetails(offer.listingId).catch(() => null);
  return { offer, listing };
};

// The offer page's data and actions: answer a counter, counter back, withdraw,
// and once accepted pay the token / cancel the order. Every action reloads the
// offer (the server's word is final).
// pay: { phase: 'paying' | 'awaiting' | 'paid' | 'failed' | 'unavailable', amount (₹ token),
// kind + message (failed / unavailable: shown as a PaymentNotice) }.
export default function useOfferDetails(offerId) {
  const remote = useRemoteData(() => loadOffer(offerId), [offerId]);
  const [busy, setBusy] = useState(null); // 'accept' | 'withdraw' | 'cancel' | 'quote' | 'counter'
  const [actionError, setActionError] = useState('');
  const [pay, setPay] = useState(null);
  const paying = useRef(false);
  const { reload } = remote;

  const run = useCallback(
    async (kind, action) => {
      setBusy(kind);
      setActionError('');
      try {
        await action();
      } catch (e) {
        setActionError(e?.message || tNow('offers.error.action'));
      } finally {
        await reload();
        setBusy(null);
      }
    },
    [reload],
  );

  const offer = remote.data?.offer;

  const accept = () => run('accept', () => acceptOffer(offer.id));
  const withdraw = () => run('withdraw', () => withdrawOffer(offer.id));
  const cancel = () => run('cancel', () => cancelOrder(offer.order.id));

  // Before cancelling a paid order: the order again, for a fresh refund quote
  // from the server (it shrinks with time). Null when it couldn't be read.
  const loadCancelQuote = async () => {
    setBusy('quote');
    setActionError('');
    try {
      return await getOrder(offer.order.id);
    } catch (e) {
      setActionError(e?.message || tNow('offers.error.action'));
      return null;
    } finally {
      setBusy(null);
    }
  };
  const counter = async amount => {
    await counterOffer(offer.id, amount);
    await reload();
  };

  // Pays the token: the payment window, then the server's confirmation.
  const payToken = async () => {
    if (paying.current || !offer?.order) return;
    paying.current = true;
    setPay({ phase: 'paying' });
    setActionError('');
    try {
      const { result, amount } = await payOrderToken(offer.order.id, { prefill: paymentPrefill() });
      if (result === 'paid') {
        setPay({ phase: 'paid', amount });
        refreshNotifications();
        await reload();
      } else if (result === 'failed') {
        setPay({ phase: 'failed', amount, kind: 'declined', message: tNow('offers.pay.failed'), messageKey: 'offers.pay.failed' });
      } else {
        setPay({ phase: 'awaiting', amount });
      }
    } catch (e) {
      if (e?.code === PAYMENTS_UNAVAILABLE || e?.code === PAYMENT_UNAVAILABLE) {
        setPay({ phase: 'unavailable', kind: 'unavailable', message: e.message });
      } else if (e?.code === PAYMENT_CANCELLED) {
        setPay({ phase: 'failed', ...paymentProblem(e) });
      } else {
        setPay({ phase: 'failed', kind: 'failed', message: e?.message || tNow('offers.pay.failed') });
      }
    } finally {
      paying.current = false;
    }
  };

  // "Waiting for confirmation": check again (pull to refresh does the same).
  // Once the server has it, the order moves on and the token panel goes.
  const [checking, setChecking] = useState(false);
  const checkAgain = async () => {
    setChecking(true);
    try {
      await reload();
    } finally {
      setChecking(false);
    }
  };

  // ...and quietly by itself every few seconds for a couple of minutes, so
  // the buyer never has to guess. Stops once the token is paid.
  const orderOpen = offer?.order?.status === 'CREATED';
  const awaiting = pay?.phase === 'awaiting' || (pay?.phase === 'paid' && orderOpen);
  useEffect(() => {
    if (!awaiting || !orderOpen) {
      return undefined;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt > AWAIT_CHECK_FOR_MS) {
        clearInterval(timer);
        return;
      }
      reload();
    }, AWAIT_CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [awaiting, orderOpen, reload]);

  return {
    ...remote,
    offer,
    listing: remote.data?.listing ?? null,
    busy,
    actionError,
    accept,
    withdraw,
    cancel,
    loadCancelQuote,
    counter,
    pay,
    payToken,
    checkAgain,
    checking,
  };
}
