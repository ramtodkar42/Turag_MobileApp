import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation } from 'react-native';

// Same pace as the content following the keyboard (useKeyboardInset).
const MOVE_MS = 220;

const animateNext = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(MOVE_MS, LayoutAnimation.Types.easeInEaseOut, 'opacity'));

// A screen that shows less while typing (e.g. Login hides its extra choices so
// the logo and the field stay above the keyboard), without a blink:
//   - it tightens as soon as the field is tapped (onFocus) - before the
//     keyboard rises - instead of after the keyboard has finished opening;
//   - every change slides / fades in step with the keyboard, both ways.
// Returns { compact, onFocus } - put onFocus on the screen's text field(s).
// animate: false when the screen only fades things in place (no layout change
// to animate - a layout animation would only risk a flicker on Android).
export default function useCompactOnKeyboard({ animate = true } = {}) {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);

  const set = useCallback(
    next => {
      if (compactRef.current === next) return;
      if (animate) animateNext();
      compactRef.current = next;
      setCompact(next);
    },
    [animate],
  );

  useEffect(() => {
    // A field focused some other way (e.g. autofocus) still opens the keyboard.
    const show = Keyboard.addListener('keyboardDidShow', () => set(true));
    // Back / Done closed the keyboard: everything returns, smoothly. The field
    // is let go too, so tapping it again counts as a new tap (onFocus) and the
    // screen tightens before the keyboard, every time.
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      set(false);
      Keyboard.dismiss();
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [set]);

  const onFocus = useCallback(() => set(true), [set]);

  return { compact, onFocus };
}
