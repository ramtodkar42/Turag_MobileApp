import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

function EditIcon({ size = ms(22), color = colors.body }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h9M7 16.5 17.5 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default EditIcon;
