import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

// The keyboard's height while it's open (0 when closed or not `enabled`). Used on
// iOS, where the reported height is reliable and already includes the home
// indicator area. (Android has useKeyboardInset, which also allows for phones
// that shrink the screen themselves.)
export default function useKeyboardHeight(enabled = true) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const show = Keyboard.addListener('keyboardDidShow', e =>
      setHeight(Math.max(0, e?.endCoordinates?.height ?? 0)),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [enabled]);

  return enabled ? height : 0;
}
