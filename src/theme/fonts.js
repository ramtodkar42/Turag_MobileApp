// Names must match the font file names in src/assets/fonts
// (e.g. Jost-Bold.ttf -> 'Jost-Bold').
//
// Titles: Jost, as the web app (apps/web/src/app/fonts.ts). The .ttf files
// are the web's own font files converted for the app (Latin only, like the
// web). The web has Jost in 500/600/700 only, so the missing weights use the
// nearest one. License: src/assets/FONT-LICENSE-OFL.txt.
// Body text: DejaVu Sans (a Verdana look-alike) - see `subtitle` below.

const fonts = {
  // Jost - titles (as the web's display font)
  title: {
    regular: 'Jost-Medium', // the web has no Jost 400
    medium: 'Jost-Medium',
    semiBold: 'Jost-SemiBold',
    bold: 'Jost-Bold',
    black: 'Jost-Bold', // the web has no Jost 800/900
  },
  // DejaVu Sans - subtitles and all body text (a free Verdana look-alike:
  // Verdana itself is a paid Microsoft font). It has only Regular and Bold,
  // so `medium` uses Regular - DejaVu's Bold is much heavier, and the two
  // can't be blended into an in-between weight. It includes the rupee sign.
  // License: src/assets/FONT-LICENSE-DejaVu.txt.
  subtitle: {
    regular: 'DejaVuSans',
    medium: 'DejaVuSans',
    bold: 'DejaVuSans-Bold',
  },
  // Inter - the web's body font, used before DejaVu Sans (files still linked).
  // subtitle: {
  //   regular: 'Inter-Regular',
  //   medium: 'Inter-Medium',
  //   bold: 'Jost-SemiBold', // the web has no bold Inter; keeps badges / highlights bold
  // },
};

// Previous app fonts (Satoshi + Space Grotesk). The files are still in
// src/assets/fonts and linked in the app; to switch back, use these instead.
// const fonts = {
//   // Satoshi - titles
//   title: {
//     regular: 'Satoshi-Regular',
//     medium: 'Satoshi-Medium',
//     bold: 'Satoshi-Bold',
//     black: 'Satoshi-Black',
//   },
//   // Space Grotesk - subtitles
//   subtitle: {
//     regular: 'SpaceGrotesk-Regular',
//     medium: 'SpaceGrotesk-Medium',
//     bold: 'SpaceGrotesk-Bold',
//   },
// };

export default fonts;
