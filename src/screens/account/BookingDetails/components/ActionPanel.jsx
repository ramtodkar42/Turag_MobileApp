import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, IconTile } from '../../../../components';
import { spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

// A card with an icon tile, a title and a line of text, and one full-width
// button (e.g. "Chat with your inspector" -> Open chat, the report -> View).
// button: { title, onPress, disabled?, variant? }
function ActionPanel({ icon, title, text, button, style }) {
  return (
    <Card style={style}>
      <View style={styles.top}>
        <IconTile name={icon} size={ms(42)} />
        <View style={styles.text}>
          <AppText variant="title" style={styles.title}>
            {title}
          </AppText>
          {text ? (
            <AppText variant="caption" style={styles.caption}>
              {text}
            </AppText>
          ) : null}
        </View>
      </View>
      {button ? (
        <Button
          title={button.title}
          size="md"
          fullWidth
          variant={button.variant ?? 'primary'}
          disabled={button.disabled}
          onPress={button.onPress}
          style={styles.button}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  caption: {
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  button: {
    marginTop: spacing.md,
  },
});

export default ActionPanel;
