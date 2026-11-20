import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getMyDealerApplication } from '../api/services/dealerApplication.api';

// The signed-in user's application to become a dealer (ADR-0101), or null when
// there's none - checked again each time the page comes into view (Turag's team
// may have moved it on). enabled: false skips the call (e.g. already a dealer).
export default function useMyDealerApplication(enabled) {
  const [application, setApplication] = useState(null);
  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        setApplication(null);
        return undefined;
      }
      let live = true;
      getMyDealerApplication().then(
        found => live && setApplication(found),
        () => {}, // Keep what's shown; the row isn't worth an error.
      );
      return () => {
        live = false;
      };
    }, [enabled]),
  );
  return application;
}
