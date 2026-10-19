import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import MenuRow from './MenuRow';
import { colors, radius, shadows, spacing } from '../../theme';
import { fs } from '../../utils/responsive';

// Section title + white card of MenuRows with dividers.
// items: [{ key, label, value?, danger?, onPress }]
function MenuGroup({ title, items, style }) {
  return (
    <View style={style}>
      {title ? (
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <View style={styles.card}>
        {items.map((item, i) => (
          <MenuRow
            key={item.key ?? item.label}
            label={item.label}
            value={item.value}
            danger={item.danger}
            onPress={item.onPress}
            showDivider={i < items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.sm,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  card: {
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
});

export default MenuGroup;
