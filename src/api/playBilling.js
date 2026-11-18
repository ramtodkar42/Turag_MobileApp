import { NativeEventEmitter, NativeModules } from 'react-native';

// Google Play Billing on Android (android/.../billing/PlayBillingModule.kt): Google's
// own payment sheet for the AI Self Inspection fee. Nothing here decides "paid":
// every purchase is sent to the server, which checks it with Google
// (api/services/selfInspection.api payForSelfInspection).

// Only the Android app has this module.
const native = () => NativeModules.PlayBilling ?? null;

// Why a purchase didn't happen (the native rejection's code).
export const PLAY_CANCELLED = 'cancelled';
export const PLAY_ALREADY_OWNED = 'already_owned';
export const PLAY_UNAVAILABLE = 'unavailable';

const playError = (code, message) => Object.assign(new Error(message), { code });

// Whether this build has the billing module (an older build simply can't buy).
export const hasPlayBilling = () => typeof native()?.purchase === 'function';

// A purchase: { token, orderId, state ('purchased' | 'pending' | 'unknown'), products,
// accountId (the Turag user), profileId (the inspection), acknowledged }.

// Opens Google's sheet for `productId`. accountId / profileId go with the purchase, so
// the server can check whose fee it is. Resolves the purchase, or rejects with a code:
// 'cancelled' | 'already_owned' | 'unavailable' | 'network' | 'busy' | 'error'.
export const buyPlayProduct = async ({ productId, accountId, profileId }) => {
  if (!hasPlayBilling()) {
    throw playError(PLAY_UNAVAILABLE, 'Google Play billing is not in this build');
  }
  const purchases = await native().purchase(productId, accountId || null, profileId || null);
  const purchase = (purchases ?? []).find(p => p.products?.includes(productId));
  if (!purchase) {
    throw playError('error', 'Google Play returned no purchase');
  }
  return purchase;
};

// Purchases bought and not consumed yet ([] where Google Play billing isn't available).
export const getPlayPurchases = async () => {
  if (!hasPlayBilling()) {
    return [];
  }
  return (await native().getPurchases()) ?? [];
};

// Finishes a purchase the server has recorded, so the fee can be bought again.
export const consumePlayPurchase = token => native().consume(token);

// Purchases that changed while no sheet was open (e.g. a pending payment that went
// through). Returns a function that stops listening.
export const onPlayPurchasesUpdated = listener => {
  if (!hasPlayBilling()) {
    return () => {};
  }
  const subscription = new NativeEventEmitter(native()).addListener('PlayBilling_purchasesUpdated', event =>
    listener(event?.purchases ?? []),
  );
  return () => subscription.remove();
};
