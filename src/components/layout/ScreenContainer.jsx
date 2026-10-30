import { useCallback, useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { MAX_CONTENT_WIDTH } from '../../constants/layout';
import useKeyboardVisible from '../../hooks/useKeyboardVisible';
import useKeyboardInset from '../../hooks/useKeyboardInset';

const IOS = Platform.OS === 'ios';
// Room kept between the focused field and the top of the keyboard.
const FIELD_GAP = spacing.xl;
// Let the content finish moving above the keyboard before scrolling the field into view.
const SCROLL_DELAY_MS = IOS ? 80 : 260;
// While the keyboard is up: how often to check whether another field got focus.
const FOCUS_CHECK_MS = 300;

// Base wrapper for every screen:
// safe area + optional header + body (scroll or fixed) + fixed footer (main button).
// On tablets the content is centered and capped at MAX_CONTENT_WIDTH.
// scrollRef (scroll screens): the ScrollView, e.g. to scroll back to the top.
// refreshControl (scroll screens): pull-to-refresh (AppRefreshControl).
//
// The keyboard: the body and footer always end at the top of the keyboard,
// and the field being typed in scrolls into view (also when moving to the next
// field). Android: useKeyboardInset pads by exactly what the keyboard covers -
// right on Android 15+ edge-to-edge (where the screen no longer shrinks) and on
// older phones that still shrink it. iOS: KeyboardAvoidingView.
// animateKeyboard: false skips the layout animation when the keyboard comes
// and goes (a screen that keeps its content still, e.g. Login).
// followFocus: false - the screen never scrolls by itself to the focused field
// (Login: its field sits high, always above the keyboard; scrolling there only
// moved the content up for nothing, as some keyboards over-report their height).
// keyboardRoom: false - no room is made for the keyboard at all (Login: its
// content stays where it is and the parts under the keyboard just fade). Some
// phones (e.g. Samsung on Android 15) shrink the screen themselves AND get the
// padding, so the scroll area ended far above the keyboard and Android
// scrolled the page up to "keep the field in view".
function ScreenContainer({
  children,
  header,
  animateKeyboard = true,
  followFocus = true,
  keyboardRoom = true,
  footer,
  scroll = false,
  scrollRef,
  refreshControl,
  padded = true,
  safeTop = true,
  backgroundColor = colors.white,
  contentStyle,
}) {
  const insets = useSafeAreaInsets();
  const iosKeyboardOpen = useKeyboardVisible();
  const androidKeyboard = useKeyboardInset({ animate: animateKeyboard });
  const keyboardOpen = IOS ? iosKeyboardOpen : androidKeyboard.open;
  const bodyStyle = [padded && styles.padded, contentStyle];
  const topInset = safeTop ? insets.top : 0;
  const scrollView = useRef(null);
  const scrollY = useRef(0);

  // Our own handle on the ScrollView, still passed on to the screen's scrollRef.
  const setScrollView = useCallback(
    node => {
      scrollView.current = node;
      if (typeof scrollRef === 'function') {
        scrollRef(node);
      } else if (scrollRef) {
        scrollRef.current = node;
      }
    },
    [scrollRef],
  );

  const onScroll = useCallback(e => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  // Brings the focused field fully into the visible part of the scroll view
  // (measured on screen, so it's right whatever the phone reports for the keyboard).
  const showFocusedField = useCallback(() => {
    const field = TextInput.State.currentlyFocusedInput();
    const list = scrollView.current;
    const host = list?.getNativeScrollRef?.() ?? list;
    if (!field?.measureInWindow || !host?.measureInWindow) {
      return;
    }
    host.measureInWindow((_x, listTop, _w, listHeight) => {
      field.measureInWindow((_fx, fieldTop, _fw, fieldHeight) => {
        const visibleBottom = listTop + listHeight - FIELD_GAP;
        const fieldBottom = fieldTop + fieldHeight;
        if (fieldBottom > visibleBottom) {
          list.scrollTo({ y: scrollY.current + (fieldBottom - visibleBottom), animated: true });
        } else if (fieldTop < listTop) {
          list.scrollTo({ y: Math.max(0, scrollY.current - (listTop - fieldTop) - spacing.md), animated: true });
        }
      });
    });
  }, []);

  // Keyboard opened (or grew): once the content has moved up, show the field.
  const keyboardSpace = IOS ? 0 : androidKeyboard.bottom;
  useEffect(() => {
    if (!scroll || !followFocus || !keyboardOpen) {
      return undefined;
    }
    const timer = setTimeout(showFocusedField, SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [scroll, followFocus, keyboardOpen, keyboardSpace, showFocusedField]);

  // Moving to another field with the keyboard up: show that one too.
  useEffect(() => {
    if (!scroll || !followFocus || !keyboardOpen) {
      return undefined;
    }
    let last = TextInput.State.currentlyFocusedInput();
    const timer = setInterval(() => {
      const now = TextInput.State.currentlyFocusedInput();
      if (now && now !== last) {
        showFocusedField();
      }
      last = now;
    }, FOCUS_CHECK_MS);
    return () => clearInterval(timer);
  }, [scroll, followFocus, keyboardOpen, showFocusedField]);

  const frame = (
    <View style={styles.frame}>
      {header}
      {scroll ? (
        <ScrollView
          ref={setScrollView}
          refreshControl={refreshControl}
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, bodyStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, bodyStyle]}>{children}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            // With the keyboard up the footer sits on it: no system-bar gap below.
            { paddingBottom: keyboardOpen ? spacing.md : Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );

  return (
    <View
      style={[styles.flex, { backgroundColor, paddingTop: topInset }]}
      onLayout={IOS ? undefined : androidKeyboard.onLayout}
    >
      {!keyboardRoom ? (
        frame
      ) : IOS ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {frame}
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.flex, { paddingBottom: androidKeyboard.bottom }]}>{frame}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});

export default ScreenContainer;
