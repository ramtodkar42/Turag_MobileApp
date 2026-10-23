import { useCallback, useState } from 'react';
import useLocationFill from '../../../hooks/useLocationFill';

const PINCODE = /^\d{6}$/;

// Where the vehicle is (as the web's listing form): the map / search / current
// location fills the city, state and area, plus the address and pincode it
// knows. City and state are required - the marketplace shows and filters by
// them ("Baner, Pune"); the fuller address stays private with the listing (for
// the handover) and is optional.
// Returns { values, set, setPincode, geo, location (useLocationFill), complete, toPayload() }.
export default function useListingLocation() {
  const [values, setValues] = useState({
    city: '',
    state: '',
    locality: '',
    address: '',
    building: '',
    landmark: '',
    pincode: '',
  });
  const [geo, setGeo] = useState(null);
  const set = key => value => setValues(prev => ({ ...prev, [key]: value }));
  const setPincode = text => set('pincode')(text.replace(/\D/g, '').slice(0, 6));

  // A place from the map: it replaces what the map knows; the typed building /
  // landmark stay unless the map names a building.
  const fillFrom = useCallback(
    place =>
      setValues(prev => ({
        ...prev,
        city: place.cityName || prev.city,
        state: place.state || prev.state,
        locality: place.area ?? '',
        address: [place.street, place.area].filter(Boolean).join(', '),
        building: place.building || prev.building,
        pincode: place.pincode || prev.pincode,
      })),
    [],
  );
  const location = useLocationFill({ fillFrom, setGeo });

  const complete = values.city.trim() !== '' && values.state.trim() !== '';

  // The backend's `location` (city + state required, the rest optional).
  const toPayload = () => ({
    city: values.city.trim(),
    state: values.state.trim(),
    locality: values.locality.trim() || null,
    pincode: PINCODE.test(values.pincode) ? values.pincode : null,
    address_line: values.address.trim() || null,
    building: values.building.trim() || null,
    landmark: values.landmark.trim() || null,
    geo_lat: geo?.lat ?? null,
    geo_lng: geo?.lng ?? null,
  });

  return { values, set, setPincode, geo, location, complete, toPayload };
}
