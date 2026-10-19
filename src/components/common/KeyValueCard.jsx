import { StyleSheet } from 'react-native';
import AppText from './AppText';
import Card from './Card';
import KeyValueRow from './KeyValueRow';
import { spacing } from '../../theme';

// rows: [{ label: 'Date', value: '25/10/2026', valueColor? }]
// Used for vehicle details, price bands, booking summary, payment details.
// `header` goes above the title (e.g. vehicle name); `dense` makes rows compact.
function KeyValueCard({ header, title, rows = [], dense = false, children, style }) {
  return (
    <Card style={[dense && styles.denseCard, style]}>
      {header}
      {title ? (
        <AppText variant="title" style={[styles.title, dense && styles.denseTitle]}>
          {title}
        </AppText>
      ) : null}
      {rows.map((row, i) => (
        <KeyValueRow
          key={row.label}
          dense={dense}
          {...row}
          showDivider={i < rows.length - 1}
        />
      ))}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.xs,
  },
  denseCard: {
    paddingVertical: spacing.md,
  },
  denseTitle: {
    marginBottom: spacing.xxs,
  },
});

export default KeyValueCard;
