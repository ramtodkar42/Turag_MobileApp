import { StyleSheet, View } from 'react-native';
import Icon from '../icons/Icon';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

// Blue circle with a white arrow and a soft halo (the moving inspector).
function InspectorMarker() {
  return (
    <View style={styles.halo}>
      <View style={styles.dot}>
        <Icon name="navigation" size={ms(14)} color={colors.white} filled />
      </View>
    </View>
  );
}

const HALO = ms(44);
const DOT = ms(28);

const styles = StyleSheet.create({
  halo: {
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(47, 128, 237, 0.25)',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.info,
  },
});

export default InspectorMarker;
