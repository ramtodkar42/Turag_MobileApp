import { useEffect, useState } from 'react';
import { getMyListing } from '../../api/services/sellerListing.api';
import { useSignedIn } from '../../store/userStore';

// Whether the signed-in user is this listing's seller, the way the web checks:
// the seller-only GET /listings/{id} answers only for them (anyone else gets
// 404/403). The seller then sees "Manage listing" instead of "Make an offer",
// and no Save. False for guests, while checking, and on any failure (the server
// still refuses an offer on your own listing).
export default function useIsMyListing(listingId) {
  const signedIn = useSignedIn();
  const [mine, setMine] = useState(false);

  useEffect(() => {
    setMine(false);
    if (!signedIn || !listingId) {
      return undefined;
    }
    let active = true;
    getMyListing(listingId).then(
      () => active && setMine(true),
      () => {},
    );
    return () => {
      active = false;
    };
  }, [signedIn, listingId]);

  return mine;
}
