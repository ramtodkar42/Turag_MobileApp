import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';

// The Home banner: a photo (car on the right) with a big white title and a
// short line on its left, e.g. "Find Your Dream Car".
function PromoBanner({ title, subtitle, image, onPress, style }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.shadow, style]}>
      <ImageBackground source={image} resizeMode="cover" style={styles.card} imageStyle={styles.image}>
        <View style={styles.text}>
          <AppText variant="h2" color={colors.white} style={styles.title}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color={colors.white} style={styles.subtitle}>
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
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  // Same shape as the photo (2.1 : 1), so the car is never cut off.
  card: {
    aspectRatio: 2.1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  image: {
    borderRadius: radius.xl,
  },
  // The left part only: the car starts at about 44% of the photo's width, so
  // the text keeps to the first ~37% (a clear gap before the car).
  text: {
    width: '36%',
    gap: spacing.xs,
  },
  title: {
    fontSize: fs(20),
    lineHeight: fs(24),
  },
  subtitle: {
    fontSize: fs(10.5),
    lineHeight: fs(14.5),
    opacity: 0.92,
  },
});

export default PromoBanner;
