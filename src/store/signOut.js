import { clearUser } from './userStore';
import { clearSaved } from './savedStore';
import { clearRecentSearches } from './recentSearchStore';
import { clearGarage } from './garageStore';
import { clearNotifications } from './notificationStore';

// Forgets the signed-in user's data kept in memory (on log out or when the
// session ends), so the next person on this phone starts clean.
export const signOutLocally = () => {
  clearUser();
  clearSaved();
  clearRecentSearches();
  clearGarage();
  clearNotifications();
};
