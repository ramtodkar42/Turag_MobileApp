import { Image, ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';

// The banner keeps the photo's own shape, so the car is never cut off on any
// screen (phones, tablets, either way up).
const shapeOf = image => {
  const size = Image.resolveAssetSource(image);
  return size?.width && size?.height ? size.width / size.height : 2.7;
};

// The Home banner: a photo (car on the right, dark on the left) with a big
// white title and a short line on its left, e.g. "Find Your Dream Car".
function PromoBanner({ title, subtitle, image, onPress, style }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.shadow, style]}>
      <ImageBackground
        source={image}
        resizeMode="cover"
        style={[styles.card, { aspectRatio: shapeOf(image) }]}
        imageStyle={styles.image}
      >
        <View style={styles.text}>
          {/* Longer words (Hindi / Marathi) shrink a little instead of spilling onto the car. */}
          <AppText
            variant="h2"
            color={colors.white}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={styles.title}
          >
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color={colors.white} numberOfLines={3} style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.xl,
    backgroundColor: colors.heading, // the photo's dark edges while it loads
    ...shadows.md,
  },
  card: {
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  image: {
    borderRadius: radius.xl,
  },
  // The dark left part only: the car starts at about 35% of the photo's
  // width, so the text keeps to the first third.
  text: {
    width: '34%',
    gap: spacing.xs,
  },
  title: {
    fontSize: fs(19),
    lineHeight: fs(23),
  },
  subtitle: {
    fontSize: fs(10.5),
    lineHeight: fs(14.5),
    opacity: 0.92,
  },
});

export default PromoBanner;
