import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { MAX_CONTENT_WIDTH } from '../../constants/layout';

// Base wrapper for every screen:
// safe area + optional header + body (scroll or fixed) + fixed footer (main button).
// On tablets the content is centered and capped at MAX_CONTENT_WIDTH.
// scrollRef (scroll screens): the ScrollView, e.g. to scroll back to the top.
// refreshControl (scroll screens): pull-to-refresh (AppRefreshControl).
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
  const bodyStyle = [padded && styles.padded, contentStyle];
  const topInset = safeTop ? insets.top : 0;

  return (
    <View style={[styles.flex, { backgroundColor, paddingTop: topInset }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.frame}>
          {header}
          {scroll ? (
            <ScrollView
              ref={scrollRef}
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
                { paddingBottom: Math.max(insets.bottom, spacing.lg) },
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
