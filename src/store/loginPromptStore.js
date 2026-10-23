import createStore from './createStore';
import { isSignedIn } from './userStore';

// The "Log in to continue" sheet (LoginPrompt) for guests. State: the reason
// it was opened for (a key of LOGIN_REASONS in LoginPrompt), or null.
const store = createStore(null);

// Use before anything that needs an account:
//   onPress={() => requireLogin('save') && toggleSaved(vehicle)}
// Signed in: true. A guest: shows the sheet and returns false.
export const requireLogin = reason => {
  if (isSignedIn()) {
    return true;
  }
  store.set(reason);
  return false;
};

export const closeLoginPrompt = () => store.set(null);

export const useLoginPromptReason = () => store.use();
