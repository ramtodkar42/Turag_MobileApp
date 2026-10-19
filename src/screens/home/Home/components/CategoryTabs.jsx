import { StyleSheet } from 'react-native';
import { SegmentedControl } from '../../../../components';
import { colors } from '../../../../theme';
import { useT } from '../../../../i18n';

// All / Cars / Bikes / Commercial: a pill bar, the chosen one filled red.
function CategoryTabs({ tabs, value, onChange, style }) {
  const t = useT();
  return (
    <SegmentedControl
      options={tabs.map(tab => ({ label: t(tab.labelKey), value: tab.id }))}
      value={value}
      onChange={onChange}
      style={[styles.bar, style]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    borderWidth: 1,
    borderColor: colors.dangerLight,
  },
});

export default CategoryTabs;
