import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { colors, fonts } from '../../theme';
import { ms } from '../../utils/responsive';

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');

// A round photo, or the name's initials (sized to the circle) when there is
// no photo or it can't be loaded.
function Avatar({ source, name, size = ms(44), style }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const [failed, setFailed] = useState(false);
  const uri = source?.uri;

  // A new photo gets a fresh chance to load.
  useEffect(() => setFailed(false), [uri]);

  if (source && !failed) {
    return <Image source={source} onError={() => setFailed(true)} style={[shape, styles.photo, style]} />;
  }

  return (
    <View style={[styles.fallback, shape, style]}>
      <AppText color={colors.primary} style={[styles.initials, { fontSize: size * 0.36, lineHeight: size * 0.46 }]}>
        {getInitials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: colors.input,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  initials: {
    fontFamily: fonts.title.bold,
  },
});

export default Avatar;
