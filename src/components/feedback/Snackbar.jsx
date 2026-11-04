import { useEffect, useRef } from 'react';
import { Animated, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../common/AppText';
import IconButton from '../common/IconButton';
import Icon from '../icons/Icon';
import { colors, shadows, spacing } from '../../theme';
import { MAX_CONTENT_WIDTH } from '../../constants/layout';
import useKeyboardInset from '../../hooks/useKeyboardInset';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

const IOS = Platform.OS === 'ios';
const MOVE_MS = 250;
const SHOW_MS = 6000;
const SLIDE = ms(64);

// A short message in a full-width bar along the bottom of the screen, on the keyboard
// when it's open: it slides up, stays about 6 seconds (or until its X is tapped), slides
// away and calls onDone. Render it as the last child of a full-screen view. Nothing on
// the screen moves for it, and touches outside it go through.
function Snackbar({ text, icon = 'check', onDone }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset({ animate: false });
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);
  const finish = useRef(onDone);
  finish.current = onDone;

  const leave = useRef(() => {
    clearTimeout(timer.current);
    Animated.timing(progress, { toValue: 0, duration: MOVE_MS, useNativeDriver: true }).start(() => finish.current?.());
  }).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: MOVE_MS, useNativeDriver: true }).start();
    timer.current = setTimeout(leave, SHOW_MS);
    return () => clearTimeout(timer.current);
  }, [progress, leave]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [SLIDE, 0] });
  const barBottom = keyboard.open ? 0 : insets.bottom;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      enabled={IOS}
      pointerEvents="box-none"
      onLayout={keyboard.onLayout}
      style={[styles.area, { paddingBottom: keyboard.bottom }]}
    >
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[styles.bar, { paddingBottom: barBottom, transform: [{ translateY }] }]}
      >
        <View style={styles.row}>
          <Icon name={icon} size={ms(18)} color={colors.white} strokeWidth={3} />
          <AppText variant="label" color={colors.white} style={styles.text}>
            {text}
          </AppText>
          <IconButton onPress={leave} size={ms(36)} backgroundColor="transparent" accessibilityLabel={t('common.close')}>
            <Icon name="close" size={ms(18)} color={colors.white} />
          </IconButton>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  area: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: colors.primaryDark,
    ...shadows.lg,
  },
  row: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    minHeight: ms(56),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  text: {
    flex: 1,
  },
});

export default Snackbar;
