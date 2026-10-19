import { ScrollView, StyleSheet } from 'react-native';
import Chip from './Chip';
import { spacing } from '../../theme';

// A row of chip-style tabs (one selected) that scrolls sideways when the tabs
// don't fit, e.g. the photo categories on the vehicle page.
// tabs: [{ id, label, count?, accessibilityLabel? }]
function ChipTabs({ tabs, value, onChange, style }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={styles.row}
      style={style}
    >
      {tabs.map(tab => (
        <Chip
          key={tab.id}
          label={tab.label}
          count={tab.count}
          selected={tab.id === value}
          onPress={() => onChange(tab.id)}
          accessibilityRole="tab"
          accessibilityLabel={tab.accessibilityLabel}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
});

export default ChipTabs;
