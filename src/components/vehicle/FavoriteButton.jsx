import { Pressable, StyleSheet } from 'react-native';
import Icon from '../icons/Icon';
import { colors } from '../../theme';
import { HIT_SLOP } from '../../constants/layout';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// Save toggle on vehicle cards/photos: a bookmark (same as the Saved tab),
// filled red when saved.
function FavoriteButton({ active = false, onPress, icon = 'bookmark', size = ms(14) }) {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={active ? t('common.removeFromSaved') : t('common.saveVehicle')}
      accessibilityState={{ selected: active }}
      style={styles.button}
    >
      <Icon
        name={icon}
        size={size}
        color={active ? colors.primary : colors.body}
        filled={active}
      />
    </Pressable>
  );
}

const SIZE = ms(24);

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
});

export default FavoriteButton;
