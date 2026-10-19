import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

// Password visibility icon. `off` draws the crossed-out eye.
function EyeIcon({ size = ms(18), color = colors.body, off = false }) {
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z" {...stroke} />
      <Circle cx="12" cy="12" r="3" {...stroke} />
      {off ? <Line x1="3" y1="3" x2="21" y2="21" {...stroke} /> : null}
    </Svg>
  );
}

export default EyeIcon;
