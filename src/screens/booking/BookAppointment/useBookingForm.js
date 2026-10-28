import { useEffect, useState } from 'react';
import useLocationFill from '../../../hooks/useLocationFill';
import useAddressForm from './useAddressForm';

// Booking form (as the web's /book): vehicle type, day + time (from the
// offered slots), the address (typed here, sent with the booking) and the
// optional "On the day" checks. The address carries the pinned spot (geo) too.
// slots: { days, enabled } from getBookingSlots (null while loading).
// The first day with a free time is picked.
export default function useBookingForm({ vehicle, slots }) {
  const addressForm = useAddressForm();
  const [category, setCategory] = useState(
    vehicle?.category === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'PASSENGER',
  );
  const [dayKey, setDayKey] = useState(null);
  const [slot, setSlot] = useState(null);
  // Optional exact spot pinned on the map: { lat, lng } (sent as geo_lat / geo_lng).
  const [geo, setGeo] = useState(null);
  // Map tap / search / current location -> pin + fill the address fields.
  const location = useLocationFill({ fillFrom: addressForm.fillFrom, setGeo });
  const [preparation, setPreparation] = useState({
    rcPresent: false,
    openSpace: false,
    keysAvailable: false,
  });
  // "Send me booking updates on WhatsApp" (as the web): ticked to start with;
  // service updates only (marketing needs its own consent).
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);

  // Slots loaded: start on the first day that still has a free time.
  useEffect(() => {
    if (slots && !dayKey) {
      const first =
        slots.days.find(d => d.slots.some(s => s.available)) ?? slots.days[0];
      setDayKey(first?.key ?? null);
    }
  }, [slots, dayKey]);

  const changeDay = key => {
    setDayKey(key);
    setSlot(null); // times differ per day
  };

  const togglePreparation = key =>
    setPreparation(prev => ({ ...prev, [key]: !prev[key] }));

  const address = addressForm.isComplete
    ? { ...addressForm.toPayload(), geo }
    : null;
  // No live payment gateway (slots.paymentsAvailable false): nothing can be booked yet.
  const ready =
    !!slots?.enabled && !!slots?.paymentsAvailable && !!slot && !!address;

  return {
    addressForm,
    category,
    setCategory,
    dayKey,
    changeDay,
    slot,
    setSlot,
    address,
    geo,
    location,
    preparation,
    togglePreparation,
    whatsappUpdates,
    toggleWhatsappUpdates: () => setWhatsappUpdates(on => !on),
    ready,
  };
}
