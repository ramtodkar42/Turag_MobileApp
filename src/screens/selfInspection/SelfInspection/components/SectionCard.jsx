import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '../../../../components';
import { spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';

// A step's card in the app's style (Card + a TitledCard-like header): title,
// optional subtitle, something on the right (e.g. a status badge).
function SectionCard({ title, subtitle, right, children, style }) {
  return (
    <Card style={[styles.card, style]}>
      {title ? (
        <View style={styles.head}>
          <View style={styles.flex}>
            <AppText variant="title" style={styles.title}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="caption" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  title: {
    fontSize: fs(16),
    lineHeight: fs(22),
  },
  subtitle: {
    marginTop: spacing.xxs,
  },
});

export default SectionCard;
