import { formatINR } from '../../../utils/format';
import { formatDateTime, formatLongSlot } from '../../../utils/date';
import { cityLabel } from '../../../utils/address';

// Where, as the web's receipt: "Building, address, City - 411004 (landmark)".
const locationText = booking => {
  const city = booking.cityCode ? cityLabel(booking.cityCode) : '';
  return [
    booking.building ? `${booking.building}, ` : '',
    booking.address,
    city ? `, ${city}` : '',
    booking.pincode ? ` - ${booking.pincode}` : '',
    booking.landmark ? ` (${booking.landmark})` : '',
  ].join('');
};

// A paid booking -> the receipt's lines (same content as the web's receipt):
// { bookingRef, vehicle, when, where, type, reference, paidOn, amount }.
// reference: the payment id (null when this phone doesn't know it).
export const buildReceipt = ({ booking, paymentRef, language, t }) => ({
  bookingRef: booking.id,
  vehicle: t(`booking.category.${booking.category === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'PASSENGER'}`),
  when: booking.slotAt ? formatLongSlot(booking.slotAt, language) : '—',
  where: locationText(booking),
  type: t('account.receipt.typeValue'),
  reference: paymentRef || null,
  // The server's own payment time - never "now", which changed on each open.
  paidOn: booking.feePaidAt ? formatDateTime(booking.feePaidAt, language) : '—',
  amount: booking.price != null ? formatINR(booking.price) : '—',
});

// Has a receipt: the fee is paid.
export const hasReceipt = booking => !!booking?.feePaid;
