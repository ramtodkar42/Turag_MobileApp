import { useEffect, useState } from 'react';
import { isAskPriceLocked } from '../api/services/featureFlags.api';

// Whether the asking price comes from the Turag valuation right now (ADR-0102):
// false until the answer is in, and if it can't be read.
export default function useAskPriceLock() {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    let live = true;
    isAskPriceLocked().then(value => live && setLocked(value));
    return () => {
      live = false;
    };
  }, []);
  return locked;
}
