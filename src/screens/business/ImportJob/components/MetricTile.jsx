import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { fs, isTablet } from '../../../../utils/responsive';

// One count tile (uploaded / registered / duplicate / invalid), as the web's
// import summary. Two per row on phones, four on tablets.
function MetricTile({ label, value, color = colors.heading }) {
  return (
    <View style={styles.tile}>
      <AppText variant="caption" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="h3" color={color} style={styles.value}>
        {String(value ?? 0)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: isTablet ? '22%' : '46%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  value: {
    fontSize: fs(22),
    lineHeight: fs(28),
    marginTop: spacing.xxs,
  },
});

export default MetricTile;
