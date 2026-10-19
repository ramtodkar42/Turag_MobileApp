import { Image, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');

function Avatar({ source, name, size = ms(44), style }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (source) {
    return <Image source={source} style={[shape, style]} />;
  }

  return (
    <View style={[styles.fallback, shape, style]}>
      <AppText variant="title" color={colors.body}>
        {getInitials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.input,
  },
});

export default Avatar;
