import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Card from './Card';
import { spacing } from '../../theme';
import { fs } from '../../utils/responsive';

// Card with a small title (and optional item on its right, e.g. a badge),
// e.g. "Inspection report", "Offers received".
function TitledCard({ title, right, children, style }) {
  return (
    <Card style={style}>
      <View style={styles.header}>
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        {right}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
});

export default TitledCard;
