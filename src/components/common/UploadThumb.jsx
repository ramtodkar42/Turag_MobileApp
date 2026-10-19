import { StyleSheet, View } from 'react-native';
import CheckCircle from './CheckCircle';
import FillImage from './FillImage';
import { colors, radius } from '../../theme';
import { ms } from '../../utils/responsive';

const SIZE = ms(44);
const BADGE = ms(16);

// Small square showing what was uploaded: the photo itself when we have it,
// otherwise the row's icon. `done` adds a green tick badge in the corner.
function UploadThumb({ preview, icon, done = false, size = SIZE }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.frame, { width: size, height: size }]}>
        {preview ? <FillImage source={preview} /> : icon}
      </View>
      {done ? (
        <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no">
          <CheckCircle size={BADGE} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: colors.input,
  },
  badge: {
    position: 'absolute',
    right: -ms(4),
    bottom: -ms(4),
    padding: ms(2),
    borderRadius: BADGE,
    backgroundColor: colors.white,
  },
});

export default UploadThumb;
