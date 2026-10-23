import { AppText } from '../../../../components';
import { colors, fonts } from '../../../../theme';

// Escape a typed word for use in a RegExp ("i10" / "S-Presso" / "c++").
const escape = word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Splits `text` into [{ part, match }] by the typed words (any case), e.g.
// "Hyundai Creta" + "cre" -> Hyundai | Cre (match) | ta.
export const splitMatches = (text, query) => {
  const words = String(query ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escape)
    // Longer words first, so "creta" wins over "c".
    .sort((a, b) => b.length - a.length);
  if (!words.length) return [{ part: text, match: false }];
  const pattern = new RegExp(`(${words.join('|')})`, 'gi');
  return String(text)
    .split(pattern)
    .filter(part => part !== '')
    .map(part => ({ part, match: words.some(w => new RegExp(`^${w}$`, 'i').test(part)) }));
};

// A suggestion's text with the letters the user typed in the theme red (bold),
// the rest in the normal text colour - as search apps do.
function HighlightText({ text, query, variant = 'subtitle', style, numberOfLines = 1 }) {
  return (
    <AppText variant={variant} color={colors.heading} numberOfLines={numberOfLines} style={style}>
      {splitMatches(text, query).map(({ part, match }, i) =>
        match ? (
          <AppText key={i} variant={variant} color={colors.primary} style={styles.match}>
            {part}
          </AppText>
        ) : (
          part
        ),
      )}
    </AppText>
  );
}

const styles = {
  match: {
    fontFamily: fonts.subtitle.bold,
  },
};

export default HighlightText;
