import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../common/AppText';
import Icon from '../icons/Icon';
import { colors, radius, shadows, spacing } from '../../theme';
import { MAX_CONTENT_WIDTH } from '../../constants/layout';
import { ms } from '../../utils/responsive';
import useKeyboardVisible from '../../hooks/useKeyboardVisible';
import PinnedToBottom from './PinnedToBottom';

export const TAB_BAR_HEIGHT = ms(60);
const TAB_BAR_GAP = spacing.sm; // space between the bar and the screen bottom

// Height a scrolling screen should leave free so content isn't hidden behind the bar.
export const useTabBarSpace = () => {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, TAB_BAR_GAP) + spacing.lg;
};

// Floating pill tab bar. Each tab screen sets `options.title` and `options.icon`.
// It stays put when the keyboard opens (no jump up) and is hidden meanwhile.
function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardVisible();

  return (
    <PinnedToBottom
      offset={Math.max(insets.bottom, TAB_BAR_GAP)}
      hidden={keyboardOpen}
      style={styles.wrapper}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.title}
              style={styles.tab}
            >
              <Icon name={options.icon} size={ms(22)} color={colors.primary} filled={focused} />
              {focused ? (
                <AppText variant="caption" color={colors.primary} style={styles.label}>
                  {options.title}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </PinnedToBottom>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH - spacing.lg * 2,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.white,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    ...shadows.lg,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: ms(2),
    fontSize: ms(10),
    lineHeight: ms(12),
  },
});

export default TabBar;
