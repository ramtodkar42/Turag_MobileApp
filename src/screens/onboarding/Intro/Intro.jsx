import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, ArrowRightIcon, Button, PaginationDots } from '../../../components';
import { colors, spacing } from '../../../theme';
import { HIT_SLOP, MAX_CONTENT_WIDTH } from '../../../constants/layout';
import { ms } from '../../../utils/responsive';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import { markIntroSeen } from '../../../utils/appPrefs';
import IntroSlide from './components/IntroSlide';
import slides from './slides';

const CARD_TOP_RATIO = 0.64; // white card starts at 64% of the screen height (as in design)
const VIEWABILITY = { itemVisiblePercentThreshold: 50 };

function Intro({ navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [size, setSize] = useState(null);
  const [index, setIndex] = useState(0);

  const width = size?.width ?? 0;
  const height = size?.height ?? 0;
  const cardTop = height * CARD_TOP_RATIO;
  const isLast = index === slides.length - 1;

  // Keep the current page in place when the device rotates (tablets).
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: index * width, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]?.index != null) {
      setIndex(viewableItems[0].index);
    }
  }).current;

  // Seen once (finished or skipped): the app opens on Login from now on.
  // Login becomes the first screen, so back doesn't return to the slides.
  const finish = () => {
    markIntroSeen();
    navigation.replace(ROUTES.LOGIN);
  };

  const goNext = () => {
    if (isLast) {
      finish();
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  const renderItem = useCallback(
    ({ item }) => <IntroSlide item={item} width={width} height={height} cardTop={cardTop} />,
    [width, height, cardTop],
  );

  const getItemLayout = useCallback(
    (_, i) => ({ length: width, offset: width * i, index: i }),
    [width],
  );

  const onLayout = e => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize(prev => (prev?.width === w && prev?.height === h ? prev : { width: w, height: h }));
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {size ? (
        <>
          <FlatList
            ref={listRef}
            data={slides}
            keyExtractor={item => item.key}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY}
          />

          <PaginationDots
            count={slides.length}
            activeIndex={index}
            inactiveColor={colors.placeholder}
            style={[styles.dots, { top: cardTop - ms(18) }]}
          />
        </>
      ) : null}

      <Pressable
        onPress={finish}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        style={[styles.skip, { top: insets.top + spacing.sm }]}
      >
        <AppText variant="label" color={colors.white} style={styles.skipText}>
          {t('onboarding.skip')}
        </AppText>
      </Pressable>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button
          title={isLast ? t('onboarding.getStarted') : t('common.next')}
          rightIcon={<ArrowRightIcon />}
          onPress={goNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  dots: {
    position: 'absolute',
    alignSelf: 'center',
  },
  skip: {
    position: 'absolute',
    right: spacing.lg,
  },
  skipText: {
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
});

export default Intro;
