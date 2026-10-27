import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, LayoutAnimation, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// How long the content takes to follow the keyboard.
const MOVE_MS = 220;

const animateNext = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(MOVE_MS, LayoutAnimation.Types.easeInEaseOut, 'opacity'));

// Android: the space the keyboard covers at the bottom of a full-height view,
// so the view can pad itself by exactly that much.
//
// Why not KeyboardAvoidingView: on Android 15+ the app is drawn edge-to-edge
// (forced for this target SDK) and the screen is no longer shrunk for the
// keyboard, and on several phones (Samsung One UI among them) React Native
// reports where the keyboard starts wrongly - so it decided nothing was
// covered. Here only the keyboard's HEIGHT is used (from the system's window
// insets, reliable everywhere), and whatever the phone already did is
// subtracted: if it shrank the view (Android 14 and older, adjustResize), that
// part is already out of the way. So each phone gets exactly the missing part,
// never twice.
//
// Returns { bottom (padding to add), open (keyboard up), onLayout (put it on
// the full-height view being measured) }. iOS: bottom stays 0 (iOS uses
// KeyboardAvoidingView, which works there).
export default function useKeyboardInset() {
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(0);
  const [baseHeight, setBaseHeight] = useState(0);
  const [height, setHeight] = useState(0);
  const keyboardRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    const show = Keyboard.addListener('keyboardDidShow', e => {
      const next = Math.max(0, e?.endCoordinates?.height ?? 0);
      if (next !== keyboardRef.current) {
        animateNext();
        keyboardRef.current = next;
        setKeyboard(next);
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      if (keyboardRef.current !== 0) {
        animateNext();
        keyboardRef.current = 0;
        setKeyboard(0);
      }
    });
    // Rotated / split screen: measure the full height again.
    const resize = Dimensions.addEventListener('change', () => setBaseHeight(0));
    return () => {
      show.remove();
      hide.remove();
      resize.remove();
    };
  }, []);

  const onLayout = useCallback(e => {
    const h = e.nativeEvent.layout.height;
    setHeight(h);
    // The full height: the tallest seen while the keyboard is down (a phone
    // that shrinks the view may do it just before the keyboard event).
    if (keyboardRef.current === 0) {
      setBaseHeight(b => Math.max(b, h));
    }
  }, []);

  // The keyboard covers its own height plus the navigation bar under it;
  // minus what the phone already shrank the view by.
  const shrunk = baseHeight > 0 ? Math.max(0, baseHeight - height) : 0;
  const bottom = keyboard > 0 ? Math.max(0, Math.round(keyboard + insets.bottom - shrunk)) : 0;

  return { bottom, open: keyboard > 0, onLayout };
}
