import { StyleSheet, View } from 'react-native';
import { AppText, FillImage } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';

const TONES = {
  user: { bg: colors.primary, text: colors.white },
  bot: { bg: colors.imagePlaceholder, text: colors.body },
};

// Rounded chat bubble with optional photo above the text.
function MessageBubble({ tone = 'bot', text, image }) {
  const t = TONES[tone];

  return (
    <View style={styles.wrapper}>
      {image ? (
        <View style={styles.image}>
          <FillImage source={typeof image === 'string' ? { uri: image } : image} />
        </View>
      ) : null}
      {text ? (
        <View style={[styles.bubble, CORNERS[tone], { backgroundColor: t.bg }]}>
          <AppText variant="body" color={t.text} style={styles.text} selectable>
            {text}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  bubble: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
  },
  // One square corner so each bubble "points" to its sender:
  // user -> top-right, TURAG.AI -> bottom-left (towards its avatar below).
  userBubble: {
    borderTopRightRadius: 0,
  },
  botBubble: {
    borderBottomLeftRadius: 0,
  },
  text: {
    fontSize: fs(15),
    lineHeight: fs(22),
  },
  image: {
    width: ms(120),
    aspectRatio: 0.85,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.input,
  },
});

const CORNERS = { user: styles.userBubble, bot: styles.botBubble };

export default MessageBubble;
