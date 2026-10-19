import { StyleSheet, View } from 'react-native';
import { TuragLogo } from '../../../../components';
import { colors, shadows } from '../../../../theme';
import { ms } from '../../../../utils/responsive';

// Small white circle with the TURAG.AI mark, shown under bot messages.
function BotAvatar() {
  return (
    <View style={styles.circle}>
      <TuragLogo height={ms(8)} />
    </View>
  );
}

const SIZE = ms(24);

const styles = StyleSheet.create({
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    ...shadows.sm,
  },
});

export default BotAvatar;
