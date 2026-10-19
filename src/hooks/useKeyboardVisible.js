import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

// True while the on-screen keyboard is open (e.g. to hide the floating tab
// bar, which Android would otherwise push up above the keyboard).
export default function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
