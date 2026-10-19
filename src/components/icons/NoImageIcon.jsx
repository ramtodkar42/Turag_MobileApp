import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

// Filled "photos" icon (two stacked pictures) for vehicles without a photo.
function NoImageIcon({ size = ms(40), color = colors.muted }) {
  return (
    <Svg width={size} height={size * 0.85} viewBox="0 0 40 34">
      {/* back picture */}
      <Path
        d="M8 5.5A3.5 3.5 0 0 1 11.5 2h23A3.5 3.5 0 0 1 38 5.5v17a3.5 3.5 0 0 1-3.5 3.5H34V9.5A3.5 3.5 0 0 0 30.5 6H8z"
        fill={color}
        opacity={0.55}
      />
      {/* front picture */}
      <Rect x="2" y="9" width="29" height="23" rx="3.5" fill={color} />
      {/* sun + mountains cut out in white */}
      <Circle cx="10" cy="16" r="2.6" fill={colors.white} />
      <Path d="M5 29l7-8 4 4.5 5-6.5 7 10z" fill={colors.white} />
    </Svg>
  );
}

export default NoImageIcon;
