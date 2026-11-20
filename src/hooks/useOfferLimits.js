import { useEffect, useState } from 'react';
import { getOfferLimits } from '../api/services/offer.api';

// The lowest offer / counter allowed on a listing (ADR-0108), read when a form
// opens (enabled) so it follows the current asking price: { askPrice, buyerMin,
// sellerMin } in rupees, or null while loading or if it can't be read (a hint
// only: an amount below it is still refused, with the minimum).
export default function useOfferLimits(listingId, enabled) {
  const [limits, setLimits] = useState(null);
  useEffect(() => {
    if (!enabled || !listingId) {
      return undefined;
    }
    let live = true;
    getOfferLimits(listingId).then(
      found => live && setLimits(found),
      () => {}, // No hint then; the server still answers with the minimum.
    );
    return () => {
      live = false;
    };
  }, [listingId, enabled]);
  return limits;
}
