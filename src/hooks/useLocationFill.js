import { useCallback, useRef, useState } from 'react';
import { addressAt } from '../api/services/geocode.api';
import { getCurrentLocation } from '../utils/currentLocation';

// Where something is, from the map (booking address, listing location): a tap
// on the map, a searched place, or the phone's current location pins the spot
// (geo) and fills the form from the address at that point (fillFrom).
// No "outside the area" warning here: whether a city is served is decided by
// the server (as on the web, which never lists the cities it serves).
// Returns { busy ('current' | 'address' | null), message ({ text, tone }),
//           place, pinAt(point), choosePlace(place), useCurrent() }.
export default function useLocationFill({ fillFrom, setGeo }) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [place, setPlace] = useState(null);
  const lookup = useRef(0);

  const apply = useCallback(
    found => {
      fillFrom(found);
      setPlace(found);
      setMessage(null);
    },
    [fillFrom],
  );

  // A point on the map: pin it, then look up its address (the latest wins).
  const pinAt = useCallback(
    async (point, known) => {
      setGeo(point);
      const id = ++lookup.current;
      if (known) {
        apply(known);
        return;
      }
      setBusy('address');
      setMessage(null);
      try {
        const found = await addressAt(point.lat, point.lng);
        if (id === lookup.current && found) {
          apply(found);
        }
      } catch (e) {
        if (id === lookup.current) {
          setMessage({ text: e.message, tone: 'error' });
        }
      } finally {
        if (id === lookup.current) {
          setBusy(null);
        }
      }
    },
    [apply, setGeo],
  );

  const choosePlace = useCallback(found => pinAt({ lat: found.lat, lng: found.lng }, found), [pinAt]);

  const useCurrent = useCallback(async () => {
    setBusy('current');
    setMessage(null);
    let point;
    try {
      point = await getCurrentLocation();
    } catch (e) {
      setMessage({ text: e.message, tone: 'error' });
      setBusy(null);
      return;
    }
    await pinAt(point);
  }, [pinAt]);

  return { busy, message, place, pinAt, choosePlace, useCurrent };
}
