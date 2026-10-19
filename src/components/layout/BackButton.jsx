import IconButton from '../common/IconButton';
import Chevron from '../common/Chevron';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

function BackButton({ onPress, style }) {
  const t = useT();
  return (
    <IconButton onPress={onPress} accessibilityLabel={t('common.back')} style={style}>
      <Chevron direction="left" size={ms(9)} style={{ marginLeft: ms(3) }} />
    </IconButton>
  );
}

export default BackButton;
