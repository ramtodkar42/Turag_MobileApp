import { useEffect, useMemo, useState } from 'react';
import { useLanguage, useT } from '../../../i18n';
import { loadPaymentRef } from '../../../api/paymentRefs';
import { buildReceipt, hasReceipt } from './receiptModel';

// The receipt for a booking (null until its fee is paid), in the app language.
export default function useReceipt(booking) {
  const t = useT();
  const language = useLanguage();
  const [paymentRef, setPaymentRef] = useState(null);
  const bookingId = booking?.id;

  useEffect(() => {
    let active = true;
    if (bookingId) {
      loadPaymentRef(bookingId).then(ref => active && setPaymentRef(ref));
    }
    return () => {
      active = false;
    };
  }, [bookingId]);

  return useMemo(
    () => (hasReceipt(booking) ? buildReceipt({ booking, paymentRef, language, t }) : null),
    [booking, paymentRef, language, t],
  );
}
