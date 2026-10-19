import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { MAX_CONTENT_WIDTH } from '../../../../constants/layout';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import GlassEdge from './GlassEdge';

const GLASS_HEIGHT = ms(52);

// One page: photo + glass-edged white card (title, subtitle).
// The photo runs GLASS_HEIGHT under the card so the frosted edge has something to blur.
function IntroSlide({ item, width, height, cardTop }) {
  const t = useT();
  const photoHeight = cardTop + GLASS_HEIGHT;

  return (
    <View style={{ width, height }}>
      <Image source={item.image} resizeMode="cover" style={{ width, height: photoHeight }} />

      <View style={[styles.card, { top: cardTop }]}>
        <GlassEdge
          source={item.image}
          width={width}
          photoHeight={photoHeight}
          offset={cardTop}
          height={GLASS_HEIGHT}
        />
        <View style={styles.content}>
          <AppText variant="h3">{t(item.titleKey)}</AppText>
          <AppText variant="subtitle" style={styles.subtitle}>
            {t(item.subtitleKey)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: colors.white,
  },
  content: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingTop: ms(36),
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.md,
  },
});

export default memo(IntroSlide);
