import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import BackButton from './BackButton';
import { spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';

// Top bar: back button, optional centered title, optional right action.
function Header({ onBack, title, right, style }) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.side}>{onBack ? <BackButton onPress={onBack} /> : null}</View>
      <AppText variant="h3" align="center" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ms(56),
    paddingHorizontal: spacing.lg,
  },
  side: {
    width: ms(48),
  },
  right: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    fontSize: fs(18),
    lineHeight: fs(24),
  },
});

export default Header;
