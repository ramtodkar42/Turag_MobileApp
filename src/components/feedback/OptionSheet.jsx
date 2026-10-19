import { Pressable, ScrollView, StyleSheet } from 'react-native';
import BottomSheet from './BottomSheet';
import AppText from '../common/AppText';
import CheckCircle from '../common/CheckCircle';
import { colors, radius, spacing } from '../../theme';
import { ms } from '../../utils/responsive';

// Bottom sheet listing choices; tapping one selects it and closes the sheet.
// options: ['Yes', 'No'] or [{ label, value }]. Long lists scroll.
function OptionSheet({ visible, title, options, value, onSelect, onClose }) {
  const items = options.map(o => (typeof o === 'string' ? { label: o, value: o } : o));

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {title ? (
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.list} bounces={false}>
        {items.map(item => {
          const selected = item.value === value;
          return (
            <Pressable
              key={String(item.value)}
              onPress={() => {
                onSelect(item.value);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.option,
                selected && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <AppText variant="body" color={colors.heading}>
                {item.label}
              </AppText>
              {selected ? <CheckCircle size={ms(20)} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.md,
  },
  scroll: {
    maxHeight: ms(440),
  },
  list: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: ms(48),
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  selected: {
    borderColor: colors.success,
  },
  pressed: {
    backgroundColor: colors.input,
  },
});

export default OptionSheet;
