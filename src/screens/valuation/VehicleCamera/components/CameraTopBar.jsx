import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Black top bar: close on the left, flash (torch) in the middle.
function CameraTopBar({ onClose, torchOn, onToggleTorch, hasTorch }) {
  const t = useT();
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onClose}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={t('valuation.camera.close')}
        style={styles.side}
      >
        <Icon name="close" size={ms(22)} color={colors.white} />
      </Pressable>

      {hasTorch ? (
        <Pressable
          onPress={onToggleTorch}
          hitSlop={HIT_SLOP}
          accessibilityRole="switch"
          accessibilityLabel={t('valuation.camera.flash')}
          accessibilityState={{ checked: torchOn }}
        >
          <Icon
            name="flash"
            size={ms(22)}
            color={torchOn ? colors.warning : colors.white}
            filled={torchOn}
          />
        </Pressable>
      ) : null}

      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  side: {
    width: ms(32),
  },
});

export default CameraTopBar;
