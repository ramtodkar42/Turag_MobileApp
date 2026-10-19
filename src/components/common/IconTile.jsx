import { StyleSheet, View } from 'react-native';
import Icon from '../icons/Icon';
import { colors, radius } from '../../theme';
import { ms } from '../../utils/responsive';

// A small tinted square with an icon (detail rows, card headers).
// size: the tile's side; the icon is about half of it.
function IconTile({ name, size = ms(36), color = colors.primary, backgroundColor = colors.dangerLight, style }) {
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor }, style]}>
      <Icon name={name} size={size * 0.5} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
});

export default IconTile;
