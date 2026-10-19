import { StyleSheet, Text } from 'react-native';
import { colors, typography } from '../../theme';
import { isDevanagari, useLanguage } from '../../i18n';

const DEFAULT_COLORS = {
  h1: colors.heading,
  h2: colors.heading,
  h3: colors.heading,
  title: colors.heading,
  button: colors.white,
  body: colors.body,
  subtitle: colors.body,
  label: colors.body,
  caption: colors.placeholder,
};

// Hindi / Marathi (Devanagari) need taller lines so the vowel marks above and
// below the letters aren't cut off.
const DEVANAGARI_LINE_HEIGHT = 1.25;

function AppText({ variant = 'body', color, align, style, children, ...rest }) {
  const language = useLanguage();
  const base = [
    typography[variant],
    { color: color ?? DEFAULT_COLORS[variant], textAlign: align },
    style,
  ];
  let devanagari = null;
  if (isDevanagari(language)) {
    const { lineHeight } = StyleSheet.flatten(base);
    if (lineHeight) {
      devanagari = { lineHeight: Math.round(lineHeight * DEVANAGARI_LINE_HEIGHT) };
    }
  }

  return (
    <Text maxFontSizeMultiplier={1.3} style={[base, devanagari]} {...rest}>
      {children}
    </Text>
  );
}

export default AppText;
