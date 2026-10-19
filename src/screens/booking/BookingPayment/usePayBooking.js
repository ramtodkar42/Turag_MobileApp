import { useRef, useState } from 'react';
import { createInspectionBooking } from '../../../api/services/booking.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';

// "Pay": books the inspection (PENDING_PAYMENT) once, then opens "Hold On",
// which pays the fee. If paying fails, "Hold On" comes back here with
// params.payError, and paying again reuses the same booking (no duplicate).
export default function usePayBooking({ navigation, route }) {
  const t = useT();
  const { category, address, slot, preparation, vehicle, valuation, payError } = route.params;
  const created = useRef(null);
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pay = async method => {
    if (sending.current) {
      return;
    }
    sending.current = true;
    setBusy(true);
    setError('');
    navigation.setParams({ payError: null });
    try {
      created.current ??= await createInspectionBooking({
        category,
        address,
        slotAt: slot.slotAt,
        preparation,
        vehicleId: vehicle?.vehicleId ?? null,
        valuationId: valuation?.valuationId ?? null,
      });
      navigation.navigate(ROUTES.PAYMENT_STATUS, { booking: created.current, method });
    } catch (e) {
      setError(
        e.code === 'BOOKING_SLOT_UNAVAILABLE'
          ? t('booking.summary.slotGone')
          : e.message || t('booking.summary.bookingError'),
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  return { pay, busy, error: error || payError || '' };
}
