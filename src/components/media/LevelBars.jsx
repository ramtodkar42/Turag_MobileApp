import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import { ms } from '../../utils/responsive';

const BAR_COUNT = 28;
const MAX_HEIGHT = ms(26);

// Voice-note bars. `levels` are 0..1 (newest last). `progress` (0..1) colours
// the played part during playback.
function LevelBars({ levels = [], progress, color = colors.primary, style }) {
  const padded = [...Array(Math.max(0, BAR_COUNT - levels.length)).fill(0.15), ...levels].slice(
    -BAR_COUNT,
  );
  const playedBars = progress == null ? BAR_COUNT : Math.round(progress * BAR_COUNT);

  return (
    <View style={[styles.row, style]}>
      {padded.map((level, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: Math.max(3, level * MAX_HEIGHT),
              backgroundColor: i < playedBars ? color : colors.placeholder,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    height: MAX_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bar: {
    width: 2.5,
    borderRadius: 2,
  },
});

export default LevelBars;
