import { useEffect, useRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme';
import { MAX_CONTENT_WIDTH } from '../../constants/layout';
import useKeyboardVisible from '../../hooks/useKeyboardVisible';

const HIDDEN_OFFSET = 400;
const SLIDE_MS = 250;

// Simple bottom sheet on core Modal (no extra library).
function BottomSheet({ visible, onClose, dismissible = true, children, style }) {
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardVisible();
  const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(HIDDEN_OFFSET);
      // JS driver on purpose: with the native driver the JS side keeps the
      // start position, so React Native cancels the first tap on the sheet's
      // buttons (Yes/No needed two taps). One short slide is cheap on the JS thread.
      Animated.timing(translateY, {
        toValue: 0,
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [visible, translateY]);

  const close = () => dismissible && onClose?.();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      {/* The sheet rises with the keyboard (a counter offer, a location search):
          the modal has its own window, which Android 15+ no longer shrinks for
          the keyboard - see ScreenContainer. */}
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: (keyboardOpen ? 0 : insets.bottom) + spacing.lg, transform: [{ translateY }] },
            style,
          ]}
        >
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.white,
  },
});

export default BottomSheet;
