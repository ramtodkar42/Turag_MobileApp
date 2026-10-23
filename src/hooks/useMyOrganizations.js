import { useEffect } from 'react';
import createStore from '../store/createStore';
import { useSignedIn } from '../store/userStore';
import { getMyOrganizations } from '../api/services/business.api';

// The signed-in user's organizations (dealer / lender / yard), shared by every
// screen that asks (e.g. a "Business accounts" row shown only when there are
// some). Loaded once per sign-in; a failed load counts as "none" so nothing
// business-only shows by mistake.
const store = createStore({ orgs: [], loading: false, loaded: false });
let pending = null;

// Loads (again) from the backend. Returns the orgs.
export const reloadMyOrganizations = () => {
  pending ??= (async () => {
    store.set(s => ({ ...s, loading: true }));
    let orgs = [];
    try {
      orgs = await getMyOrganizations();
    } catch {
      orgs = [];
    }
    store.set({ orgs, loading: false, loaded: true });
    pending = null;
    return orgs;
  })();
  return pending;
};

// Puts a fresh list in (e.g. after Business home loaded it itself).
export const setMyOrganizations = orgs => store.set({ orgs, loading: false, loaded: true });

// Sign-out: forget them.
export const clearMyOrganizations = () => store.set({ orgs: [], loading: false, loaded: false });

// { orgs: [{ id, name, type, status, role, active, portal }], loading }
export default function useMyOrganizations() {
  const signedIn = useSignedIn();
  const state = store.use();

  useEffect(() => {
    if (!signedIn) {
      if (store.get().loaded) {
        clearMyOrganizations();
      }
      return;
    }
    if (!store.get().loaded) {
      reloadMyOrganizations();
    }
  }, [signedIn]);

  return signedIn ? { orgs: state.orgs, loading: state.loading || !state.loaded } : { orgs: [], loading: false };
}

export { useMyOrganizations };
