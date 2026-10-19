import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Icon from '../icons/Icon';
import { colors, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';

// Small grey icon + text, e.g. a clock + "Today, 10:30" or a pin + "4.3 km".
function IconText({ icon, text, color = colors.body, style }) {
  return (
    <View style={[styles.row, style]}>
      <Icon name={icon} size={ms(12)} color={color} />
      <AppText variant="caption" color={color} numberOfLines={1} style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 1,
    flexShrink: 1,
  },
  text: {
    flexShrink: 1,
    fontSize: fs(11),
    lineHeight: fs(15),
  },
});

export default IconText;
