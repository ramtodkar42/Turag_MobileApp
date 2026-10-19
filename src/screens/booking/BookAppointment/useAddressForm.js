import { useState } from 'react';

const PINCODE = /^\d{6}$/;

// Where the vehicle will be, entered for each booking (as the web's /book -
// the address is sent with the booking, not saved separately): flat /
// building, street & area, pincode. The city ('PUNE' | 'PCMC' | null) comes
// from the place picked on the map / search / current location.
export default function useAddressForm() {
  const [values, setValues] = useState({
    line1: '',
    area: '',
    pincode: '',
    city: null,
  });
  const set = key => value => setValues(prev => ({ ...prev, [key]: value }));
  const setPincode = text => set('pincode')(text.replace(/\D/g, '').slice(0, 6));

  // A place from the map / search / current location (geocode.api mapPlace).
  // A new place replaces the whole address: what the map doesn't know (often
  // the flat / building) is left empty to type in - never the old place's text.
  const fillFrom = place =>
    setValues({
      line1: place.building ?? '',
      area: [place.street, place.area].filter(Boolean).join(', '),
      pincode: place.pincode ?? '',
      city: place.city ?? null,
    });

  // The backend needs at least 4 characters of address.
  const valid = {
    line1: values.line1.trim().length >= 3,
    area: values.area.trim().length >= 2,
    pincode: PINCODE.test(values.pincode),
  };
  const isComplete = Object.values(valid).every(Boolean);

  const toPayload = () => ({
    line1: values.line1.trim(),
    area: values.area.trim(),
    city: values.city,
    pincode: values.pincode,
  });

  return { values, valid, isComplete, set, setPincode, fillFrom, toPayload };
}
