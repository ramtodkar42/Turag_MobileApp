import { StyleSheet, View } from 'react-native';
import VehicleImage from './VehicleImage';
import AppText from '../common/AppText';
import Card from '../common/Card';
import { spacing } from '../../theme';
import { ms } from '../../utils/responsive';

// Horizontal vehicle summary (booking summary, inspector's assigned list).
// The photo fills the card's height, so the gap around it is equal on all sides.
// `imageOverlay` sits on the photo's top-right corner (e.g. verified tick).
// Extra lines (price, actions) go in children.
function VehicleRow({ image, title, subtitle, imageOverlay, children, style }) {
  return (
    <Card padded={false} style={[styles.card, style]}>
      <View style={styles.imageWrap}>
        <VehicleImage source={image} style={styles.image} />
        {imageOverlay ? <View style={styles.overlay}>{imageOverlay}</View> : null}
      </View>
      <View style={styles.info}>
        <AppText variant="title" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
        {children}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
  },
  imageWrap: {
    width: '42%',
    minHeight: ms(96),
  },
  image: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  info: {
    flex: 1,
    gap: spacing.xxs,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
});

export default VehicleRow;
