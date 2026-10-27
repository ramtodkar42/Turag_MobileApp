import { useCallback, useState } from 'react';

const PINCODE = /^\d{6}$/;

// Where the vehicle will be, entered for each booking - the same fields as the
// web's /book: Home / Office, the address, the building / flat / house and an
// optional landmark (what a map pin can't tell the inspector), and the pincode.
// The city, area and state come from the map (as the web): the server decides
// from the city + pincode whether doorstep inspections are offered there
// (service area), so the app never lists the cities it serves.
// Sent with the booking, not saved.
export default function useAddressForm() {
  const [values, setValues] = useState({
    place: 'home', // 'home' | 'office' (shown only, as on the web)
    address: '',
    building: '',
    landmark: '',
    pincode: '',
    city: '', // the map's city name, e.g. "Pune", "Mumbai"
    locality: '', // the area within it, e.g. "Baner"
    state: '',
  });
  const set = key => value => setValues(prev => ({ ...prev, [key]: value }));
  const setPincode = text =>
    set('pincode')(text.replace(/\D/g, '').slice(0, 6));

  // A place from the map / search / current location (geocode.api mapPlace).
  // A new place replaces the address: what the map doesn't know (often the
  // flat / building) is left empty to type in - never the old place's text.
  // The typed landmark stays.
  const fillFrom = useCallback(
    place =>
      setValues(prev => ({
        ...prev,
        building: place.building ?? '',
        address: [place.street, place.area].filter(Boolean).join(', '),
        pincode: place.pincode ?? '',
        city: place.cityName ?? '',
        locality: place.area ?? '',
        state: place.state ?? '',
      })),
    [],
  );

  // As the web: at least 4 characters of address and a 6-digit pincode.
  const valid = {
    address: values.address.trim().length >= 4,
    pincode: PINCODE.test(values.pincode),
    building: values.building.trim().length > 0,
  };
  const isComplete = valid.address && valid.pincode;

  const toPayload = () => ({
    place: values.place,
    address: values.address.trim(),
    building: values.building.trim(),
    landmark: values.landmark.trim(),
    pincode: values.pincode,
    city: values.city.trim(),
    locality: values.locality.trim(),
    state: values.state.trim(),
  });

  return { values, valid, isComplete, set, setPincode, fillFrom, toPayload };
}
