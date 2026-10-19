import { forwardRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { FillImage, Icon, IconButton } from '../../../../components';
import { colors, fonts, radius, shadows, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// "+" (attach photo) button, pill text field, and a red send button that
// appears when there's something to send. Shows the attached photo above.
// Without onAttach there's no "+". placeholder / inputProps (keyboardType,
// maxLength, ...) customise the field; canSend overrides when Send shows.
const ChatInput = forwardRef(function ChatInput(
  { value, onChangeText, attachment, onAttach, onRemoveAttachment, onSend, placeholder, inputProps, canSend: canSendProp },
  ref,
) {
  const t = useT();
  const canSend = canSendProp ?? (value.trim().length > 0 || !!attachment);

  return (
    <View>
      {attachment ? (
        <View style={styles.preview}>
          <FillImage source={{ uri: attachment.uri }} />
          <Pressable
            onPress={onRemoveAttachment}
            hitSlop={HIT_SLOP}
            accessibilityLabel={t('chat.removePhoto')}
            style={styles.remove}
          >
            <Icon name="close" size={ms(10)} color={colors.white} strokeWidth={2.5} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.row}>
        {onAttach ? (
          <IconButton
            onPress={onAttach}
            size={FIELD_HEIGHT}
            backgroundColor={colors.white}
            accessibilityLabel={t('chat.attachPhoto')}
            style={styles.shadow}
          >
            <Icon name="plus" size={ms(20)} color={colors.heading} />
          </IconButton>
        ) : null}

        <View style={[styles.field, styles.shadow]}>
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder ?? t('chat.placeholder')}
            placeholderTextColor={colors.placeholder}
            multiline={!inputProps}
            maxFontSizeMultiplier={1.3}
            style={styles.input}
            {...inputProps}
          />
          {canSend ? (
            <Pressable
              onPress={onSend}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={t('chat.send')}
              style={({ pressed }) => [styles.send, pressed && styles.pressed]}
            >
              <Icon name="arrowUp" size={ms(16)} color={colors.white} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
});

// The "+" button matches the field's height so the row lines up.
const FIELD_HEIGHT = ms(52);
const SEND = ms(32);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  shadow: {
    ...shadows.md,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: FIELD_HEIGHT,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    maxHeight: ms(130),
    paddingVertical: spacing.md,
    fontFamily: fonts.subtitle.regular,
    fontSize: fs(16),
    color: colors.heading,
  },
  send: {
    width: SEND,
    height: SEND,
    borderRadius: SEND / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  preview: {
    width: ms(64),
    height: ms(64),
    marginLeft: FIELD_HEIGHT + spacing.sm,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  remove: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
});

export default ChatInput;
