import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';
import { useSignedIn } from '../../store/userStore';
import { useUnseenOpenInspection } from '../../store/garageStore';

// The Garage tab's red dot: an AI self-inspection there is still open and the owner
// hasn't looked at it in the Garage yet. Opening the Garage clears it for good (Home's
// "continue" row is the everyday reminder); a new open inspection brings it back.
function GarageTabDot() {
  const signedIn = useSignedIn();
  const unseen = useUnseenOpenInspection();
  if (!signedIn || !unseen) return null;
  return <View style={styles.dot} accessibilityElementsHidden importantForAccessibility="no" />;
}

const DOT = ms(9);

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -ms(1),
    right: -ms(3),
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: ms(1.5),
    borderColor: colors.white,
    backgroundColor: colors.primary,
  },
});

export default GarageTabDot;
