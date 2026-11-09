import { useRef, useState } from 'react';
import { newIdempotencyKey } from '../../../api/client';
import { submitOffer } from '../../../api/services/offer.api';
import { errorText, OFFER_ERROR_KEYS } from '../../../utils/errorText';

const MAX_PRICE_DIGITS = 9; // up to ₹99,99,99,999

// Offer form: the price (digits only); submits it to the API.
// One idempotency key per offer: retries after an error reuse it, so the
// backend never creates the offer twice.
export default function useOfferForm(vehicleId) {
  const [price, setPriceDigits] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const offerKey = useRef(null);

  const setPrice = text => {
    setPriceDigits(text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_PRICE_DIGITS));
    setError('');
    // A different amount is a different offer.
    offerKey.current = null;
  };

  const isValid = Number(price) > 0;

  const submit = async () => {
    if (submitting || sent) {
      return;
    }
    offerKey.current = offerKey.current ?? newIdempotencyKey();
    setSubmitting(true);
    setError('');
    try {
      await submitOffer({
        vehicleId,
        price: Number(price),
        idempotencyKey: offerKey.current,
      });
      setSent(true);
    } catch (e) {
      // As the web: the server's own reason when it says why you can't offer
      // (e.g. verify your identity first); otherwise the app's words for the code.
      setError(
        e?.code === 'ELIGIBILITY_BLOCKED' && e.message
          ? e.message
          : errorText(e, OFFER_ERROR_KEYS, 'marketplace.offer.sendError'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return { price, setPrice, isValid, submit, submitting, sent, error };
}
