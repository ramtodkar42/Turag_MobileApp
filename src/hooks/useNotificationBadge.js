import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadNotifications, useUnreadCount } from '../store/notificationStore';
import { useSignedIn } from '../store/userStore';

// Like the web's bell, check for new notifications now and then.
const POLL_MS = 60000;

// Unread count for the bell, kept fresh while the screen is in front: loads on
// focus, every minute, and when the app comes back to the foreground. Quiet
// (no spinner); the store skips calls made too close together. Guests have no
// notifications (starts as soon as they log in).
export default function useNotificationBadge() {
  const signedIn = useSignedIn();
  useFocusEffect(
    useCallback(() => {
      if (!signedIn) {
        return undefined;
      }
      loadNotifications();
      const poll = setInterval(loadNotifications, POLL_MS);
      const appState = AppState.addEventListener('change', next => {
        if (next === 'active') {
          loadNotifications();
        }
      });
      return () => {
        clearInterval(poll);
        appState.remove();
      };
    }, [signedIn]),
  );
  return useUnreadCount();
}
