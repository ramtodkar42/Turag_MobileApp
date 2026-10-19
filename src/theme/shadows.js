import { Platform } from 'react-native';

const shadow = (elevation, opacity, radiusSize) =>
  Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: opacity,
      shadowRadius: radiusSize,
    },
    android: { elevation },
  });

const shadows = {
  sm: shadow(2, 0.06, 4),
  md: shadow(4, 0.08, 10),
  lg: shadow(8, 0.12, 16),
};

export default shadows;
