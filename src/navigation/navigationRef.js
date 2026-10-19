import { createNavigationContainerRef } from '@react-navigation/native';

// Lets non-screen code (e.g. "session expired") move to a screen.
export const navigationRef = createNavigationContainerRef();

// Clears history and opens `name` (no-op until the navigator is ready).
export const resetTo = (name, params) => {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name, params }] });
  }
};
