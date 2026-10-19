import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Card from './Card';
import { spacing } from '../../theme';
import { fs } from '../../utils/responsive';

// Title + subtitle card used at the top of most screens.
function HeaderCard({ title, subtitle, right, style }) {
  return (
    <Card style={style}>
      <View style={styles.row}>
        <AppText variant="h3" style={styles.title}>
          {title}
        </AppText>
        {right}
      </View>
      {subtitle ? (
        <AppText variant="subtitle" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: fs(13),
    lineHeight: fs(19),
  },
});

export default HeaderCard;
