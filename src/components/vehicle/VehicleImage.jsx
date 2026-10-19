import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import FillImage from '../common/FillImage';
import NoImageIcon from '../icons/NoImageIcon';
import SkeletonBox from '../feedback/SkeletonBox';
import SkeletonPulse from '../feedback/SkeletonPulse';
import { colors, radius, spacing } from '../../theme';
import { fs } from '../../utils/responsive';
import { useT } from '../../i18n';

// Vehicle photo with a "No Image" fallback (grey frame + photos icon + label).
// The frame (View) decides the size from `style`; the photo only fills it.
// `loading`: the photo is still being fetched (e.g. the Saved tab enriches its
// images after the list loads) - show a pulsing skeleton instead of "No Image".
function VehicleImage({ source, loading = false, style }) {
  const t = useT();
  const empty = !source && !loading;
  return (
    <View style={[styles.frame, empty && styles.placeholder, style]}>
      {source ? (
        <FillImage source={source} />
      ) : loading ? (
        <SkeletonPulse style={StyleSheet.absoluteFill}>
          <SkeletonBox width="100%" height="100%" style={styles.skeleton} />
        </SkeletonPulse>
      ) : (
        <>
          <NoImageIcon />
          <AppText variant="caption" color={colors.muted} style={styles.label}>
            {t('common.noImage')}
          </AppText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.imagePlaceholder,
  },
  skeleton: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  label: {
    fontSize: fs(10),
    lineHeight: fs(14),
  },
});

export default VehicleImage;
