import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Icon } from '../../../../components';
import { colors } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { ms } from '../../../../utils/responsive';
import { copyToClipboard } from '../../../../utils/clipboard';
import { useT } from '../../../../i18n';

const COPIED_RESET_MS = 1500;

// Copy icon next to a bot message; shows a tick for a moment after copying.
function CopyButton({ text }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = () => {
    if (!copyToClipboard(text)) {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  return (
    <Pressable
      onPress={copy}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={t(copied ? 'chat.copied' : 'chat.copy')}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Icon
        name={copied ? 'check' : 'copy'}
        size={ms(16)}
        color={copied ? colors.success : colors.body}
        strokeWidth={1.6}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.5,
  },
});

export default CopyButton;
