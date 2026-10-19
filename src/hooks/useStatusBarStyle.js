import { useCallback } from 'react';
import { StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Status bar style for one screen (e.g. 'light-content' on red/black screens).
// Switches back to the app default when the screen loses focus, so the next
// screen isn't left with white icons on a white background.
export default function useStatusBarStyle(style, fallback = 'dark-content') {
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(style, true);
      return () => StatusBar.setBarStyle(fallback, true);
    }, [style, fallback]),
  );
}
