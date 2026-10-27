import { useEffect, useRef, useState } from 'react';
import { createInspectionBooking } from '../../../api/services/booking.api';
import { getVerificationStatus, needsVerification } from '../../../api/services/verification.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { comingSoonPlace } from '../comingSoonPlace';

// "Pay": books the inspection (PENDING_PAYMENT) once, then - as the web -
// asks for an ID first if the user isn't verified yet ("Verify your identity"),
// and opens "Hold On", which pays the fee. If paying fails, "Hold On" comes
// back here with params.payError, and paying again reuses the same booking
// (no duplicate). The verification status is read as soon as this screen
// opens, so tapping Pay doesn't wait for it.
export default function usePayBooking({ navigation, route }) {
  const t = useT();
  const { category, address, slot, preparation, vehicle, valuation, payError } = route.params;
  const created = useRef(null);
  const sending = useRef(false);
  const verification = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    verification.current = getVerificationStatus().catch(() => null);
  }, []);

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
      // Read again each time (a submitted ID is PENDING_REVIEW from then on).
      // DigiLocker mode skips the ID step here (as the web): verify from Profile.
      const current = await (verification.current ?? getVerificationStatus().catch(() => null));
      verification.current = null;
      const next = needsVerification(current?.verification, current?.options)
        ? ROUTES.VERIFY_IDENTITY
        : ROUTES.PAYMENT_STATUS;
      navigation.navigate(next, { booking: created.current, method });
    } catch (e) {
      // The server's own service-area check (the backstop for the check on the
      // form): the same "Coming soon to <city>" screen, not an error.
      if (e.code === 'CITY_NOT_SERVICEABLE') {
        navigation.navigate(ROUTES.BOOKING_COMING_SOON, {
          place: comingSoonPlace(address),
          category,
          vehicleId: vehicle?.vehicleId ?? null,
          slotAt: slot.slotAt,
        });
        return;
      }
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
