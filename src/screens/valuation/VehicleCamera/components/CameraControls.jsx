import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Bottom bar: big white shutter, "Photo" mode label, flip-camera button.
function CameraControls({ onCapture, onFlip, disabled }) {
  const t = useT();
  return (
    <View style={styles.bar}>
      <View style={styles.side} />

      <View style={styles.center}>
        <Pressable
          onPress={onCapture}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t('valuation.camera.takePhoto')}
          accessibilityState={{ disabled }}
          style={({ pressed }) => [styles.shutterRing, (pressed || disabled) && styles.dimmed]}
        >
          <View style={styles.shutter} />
        </Pressable>
        <View style={styles.mode}>
          <AppText variant="caption" color={colors.warning} style={styles.modeText}>
            {t('valuation.camera.photo')}
          </AppText>
        </View>
      </View>

      <View style={[styles.side, styles.right]}>
        <Pressable
          onPress={onFlip}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t('valuation.camera.switch')}
        >
          <Icon name="flip" size={ms(24)} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const SHUTTER = ms(64);

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  side: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  center: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  shutterRing: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: SHUTTER - 12,
    height: SHUTTER - 12,
    borderRadius: (SHUTTER - 12) / 2,
    backgroundColor: colors.white,
  },
  dimmed: {
    opacity: 0.5,
  },
  mode: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  modeText: {
    fontSize: fs(11),
  },
});

export default CameraControls;
