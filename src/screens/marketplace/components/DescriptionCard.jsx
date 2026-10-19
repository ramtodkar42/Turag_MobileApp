import { StyleSheet, View } from 'react-native';
import { AppText, Card } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';

// Seller's description of the vehicle: in a card, or with a `title` as a plain
// section ("About This Car"). Nothing when there's no text.
function DescriptionCard({ text, title, style }) {
  if (!text) {
    return null;
  }
  const body = (
    <AppText variant="subtitle" color={colors.heading} style={styles.text}>
      {text}
    </AppText>
  );
  if (title) {
    return (
      <View style={style}>
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        {body}
      </View>
    );
  }
  return <Card style={style}>{body}</Card>;
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.xs,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  text: {
    fontSize: fs(13),
    lineHeight: fs(19),
  },
});

export default DescriptionCard;
