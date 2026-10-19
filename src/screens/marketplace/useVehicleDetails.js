import { useCallback, useEffect, useState } from 'react';
import { getVehicleDetails } from '../../api/services/vehicle.api';
import prefetchImages from '../../utils/prefetchImages';
import { tNow } from '../../i18n';

// Warm the OS image cache with the gallery photos so swiping between them is
// instant (the hero is usually already cached from the marketplace card).
const prefetchGallery = details => {
  const all = [
    ...(details.images ?? []),
    ...(details.photoGroups ?? []).flatMap(group => group.images ?? []),
  ];
  prefetchImages(all, 8);
};

// Full vehicle details. Starts with the card's data (so the page shows
// instantly), then fills in the rest from the API.
// notFound: the listing has left the marketplace (sold / withdrawn).
export default function useVehicleDetails(initialVehicle) {
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getVehicleDetails(initialVehicle.id)
      .then(details => {
        if (active) {
          // Keep the card photo if the page has none yet.
          setVehicle(prev => ({ ...details, image: details.image ?? prev.image }));
          setError('');
          prefetchGallery(details);
        }
      })
      .catch(e => {
        if (active) {
          setNotFound(e.code === 'NOT_FOUND');
          setError(e.message || tNow('marketplace.loadError'));
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [initialVehicle.id, attempt]);

  const retry = useCallback(() => setAttempt(n => n + 1), []);

  return { vehicle, loading, error, notFound, retry };
}
