import { useRef, useState } from 'react';
import { newIdempotencyKey } from '../../../api/client';
import { submitOffer } from '../../../api/services/offer.api';
import { tNow } from '../../../i18n';

const MAX_PRICE_DIGITS = 9; // up to ₹99,99,99,999

// Offer form: price (digits only) + optional message; submits to the API.
// One idempotency key per offer: retries after an error reuse it, so the
// backend never creates the offer twice.
export default function useOfferForm(vehicleId) {
  const [price, setPriceDigits] = useState('');
  const [message, setMessage] = useState('');
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
        message: message.trim(),
        idempotencyKey: offerKey.current,
      });
      setSent(true);
    } catch (e) {
      setError(e.message || tNow('marketplace.offer.sendError'));
    } finally {
      setSubmitting(false);
    }
  };

  return { price, setPrice, message, setMessage, isValid, submit, submitting, sent, error };
}
