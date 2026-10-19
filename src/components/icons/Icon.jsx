import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';
import iconPaths from './iconPaths';
import iconPathsFilled from './iconPathsFilled';

// <Icon name="search" /> - outline icon.
// `filled` draws the solid version (iconPathsFilled) when one exists,
// otherwise fills the outline path.
function Icon({ name, size = ms(20), color = colors.heading, filled = false, strokeWidth = 1.8 }) {
  const solid = filled ? iconPathsFilled[name] : null;

  if (solid) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d={solid.shape}
          fill={color}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        {solid.details ? (
          <Path
            d={solid.details}
            stroke={colors.white}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={iconPaths[name]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export default Icon;
