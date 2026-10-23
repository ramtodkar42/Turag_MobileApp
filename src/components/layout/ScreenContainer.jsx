import { useCallback, useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { MAX_CONTENT_WIDTH } from '../../constants/layout';
import useKeyboardVisible from '../../hooks/useKeyboardVisible';

// Room kept between the focused field and the top of the keyboard.
const FIELD_GAP = spacing.xxl;
// Let the keyboard padding settle before scrolling the field into view.
const SCROLL_DELAY_MS = 120;

// Base wrapper for every screen:
// safe area + optional header + body (scroll or fixed) + fixed footer (main button).
// On tablets the content is centered and capped at MAX_CONTENT_WIDTH.
// scrollRef (scroll screens): the ScrollView, e.g. to scroll back to the top.
// refreshControl (scroll screens): pull-to-refresh (AppRefreshControl).
//
// The keyboard: the body and footer always end at the top of the keyboard,
// and the field being typed in scrolls into view. On Android 15+ the app is
// drawn edge-to-edge (forced for this target SDK), so the system no longer
// shrinks the screen for the keyboard ("adjustResize") - the keyboard would
// cover the content. KeyboardAvoidingView adds only the part the keyboard
// actually covers, so phones that still shrink the screen (Android 14 and
// older) get nothing extra and nothing moves twice.
function ScreenContainer({
  children,
  header,
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
  const keyboardOpen = useKeyboardVisible();
  const bodyStyle = [padded && styles.padded, contentStyle];
  const topInset = safeTop ? insets.top : 0;
  const scrollView = useRef(null);

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

  // Keyboard opened: bring the focused field above it.
  useEffect(() => {
    if (!scroll) {
      return undefined;
    }
    let timer;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const field = TextInput.State.currentlyFocusedInput();
        if (field && scrollView.current?.scrollResponderScrollNativeHandleToKeyboard) {
          scrollView.current.scrollResponderScrollNativeHandleToKeyboard(field, FIELD_GAP, true);
        }
      }, SCROLL_DELAY_MS);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [scroll]);

  return (
    <View style={[styles.flex, { backgroundColor, paddingTop: topInset }]}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.frame}>
          {header}
          {scroll ? (
            <ScrollView
              ref={setScrollView}
              refreshControl={refreshControl}
              style={styles.flex}
              contentContainerStyle={[styles.scrollContent, bodyStyle]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
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
      </KeyboardAvoidingView>
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
