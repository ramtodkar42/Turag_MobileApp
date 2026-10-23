import { ScrollView, StyleSheet, View } from 'react-native';
import { SectionHeader } from '../../../../components';
import { spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import RecentSearchItem from './RecentSearchItem';

// "Recent Searches  Clear all" + a horizontal row of circles. Hidden when empty.
function RecentSearches({ items, onSelect, onClear }) {
  const t = useT();
  if (items.length === 0) {
    return null;
  }
  return (
    <View>
      <SectionHeader
        title={t('saved.recent.title')}
        actionLabel={t('saved.recent.clear')}
        onAction={onClear}
        style={styles.header}
        titleStyle={styles.title}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map(item => (
          <RecentSearchItem key={`${item.filter?.id ?? 'q'}:${item.query}`} item={item} onPress={onSelect} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: fs(13),
    lineHeight: fs(18),
  },
});

export default RecentSearches;
