import { View } from 'react-native';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

// Drawn with borders, so no icon library is needed.
const ROTATION = { left: '45deg', right: '-135deg', up: '135deg', down: '-45deg' };

function Chevron({
  direction = 'left',
  size = ms(10),
  color = colors.heading,
  thickness = 2,
  style,
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderLeftWidth: thickness,
          borderBottomWidth: thickness,
          borderColor: color,
          transform: [{ rotate: ROTATION[direction] }],
        },
        style,
      ]}
    />
  );
}

export default Chevron;
