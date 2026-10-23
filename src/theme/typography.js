import { fs } from '../utils/responsive';
import fonts from './fonts';

// Jost for titles (the web's), DejaVu Sans for subtitles/body (fonts.js).
// (Before: Inter for body like the web; earlier Satoshi + Space Grotesk.)
// Change a size here and every screen using that variant updates.
const typography = {
  h1: { fontFamily: fonts.title.bold, fontSize: fs(32), lineHeight: fs(40) },
  h2: { fontFamily: fonts.title.bold, fontSize: fs(28), lineHeight: fs(36) },
  h3: { fontFamily: fonts.title.bold, fontSize: fs(23), lineHeight: fs(30) },
  title: { fontFamily: fonts.title.bold, fontSize: fs(17), lineHeight: fs(23) },
  button: { fontFamily: fonts.title.bold, fontSize: fs(17), lineHeight: fs(23) },
  body: { fontFamily: fonts.subtitle.regular, fontSize: fs(16), lineHeight: fs(23) },
  subtitle: { fontFamily: fonts.subtitle.regular, fontSize: fs(15), lineHeight: fs(22) },
  label: { fontFamily: fonts.subtitle.medium, fontSize: fs(14), lineHeight: fs(19) },
  caption: { fontFamily: fonts.subtitle.regular, fontSize: fs(13), lineHeight: fs(18) },
};

export default typography;
