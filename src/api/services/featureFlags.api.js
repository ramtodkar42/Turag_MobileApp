// Ops feature flags (ADR-0102): product rules Turag's team switches on / off
// without an app update. The app only reads them to adapt its screens; the
// server checks every rule again on each write.
import { request } from '../client';
import { USE_REAL_API } from '../config';
import { ENDPOINTS } from '../endpoints';

// { FLAG_KEY: true | false } - a key that's missing means off.
export const getFeatureFlags = async () => {
  const data = await request(ENDPOINTS.FEATURE_FLAGS);
  return data?.flags ?? {};
};

// Whether a listing's asking price is set from the Turag valuation (the seller
// can't set or change it). If the flags can't be read, it's taken as off (as
// the web), so a seller is never stuck: the server then still sets the price
// itself on create, and refuses a price change with a clear message.
export const isAskPriceLocked = async () => {
  if (!USE_REAL_API.listings) {
    return false;
  }
  try {
    const flags = await getFeatureFlags();
    return flags.VALUATION_ASK_PRICE_LOCK === true;
  } catch {
    return false;
  }
};
