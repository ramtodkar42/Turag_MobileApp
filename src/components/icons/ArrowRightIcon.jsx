import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

function ArrowRightIcon({ size = ms(18), color = colors.white }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default ArrowRightIcon;
