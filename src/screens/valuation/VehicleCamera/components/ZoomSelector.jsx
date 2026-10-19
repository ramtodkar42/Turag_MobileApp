import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Round zoom chips (1x, 2X) at the bottom of the preview.
function ZoomSelector({ levels, value, onChange }) {
  const t = useT();
  if (levels.length < 2) {
    return null;
  }
  return (
    <View style={styles.row}>
      {levels.map(level => {
        const active = level === value;
        return (
          <Pressable
            key={level}
            onPress={() => onChange(level)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t('valuation.camera.zoom', { level })}
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.active]}
          >
            <AppText
              variant="caption"
              color={active ? colors.white : colors.border}
              style={styles.text}
            >
              {active ? `${level}X` : level}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const SIZE = ms(30);

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.xxs,
    borderRadius: SIZE,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  chip: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  text: {
    fontSize: fs(11),
  },
});

export default ZoomSelector;
