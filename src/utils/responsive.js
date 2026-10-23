import { Dimensions, PixelRatio } from 'react-native';

// Designs are made on a 375pt wide phone.
const BASE_WIDTH = 375;

const { width, height } = Dimensions.get('window');
// Short side keeps sizes stable in both portrait and landscape.
const shortSide = Math.min(width, height);

export const isTablet = shortSide >= 600;

// Linear scale against the design width.
export const scale = size => (shortSide / BASE_WIDTH) * size;

// Moderate scale: grows less than linear, so tablets don't get oversized UI.
export const ms = (size, factor = isTablet ? 0.3 : 0.5) =>
  size + (scale(size) - size) * factor;

// Makes all text a little bigger (or smaller) across the whole app at once -
// every font size and line height goes through fs(), and each gets this many
// points added to its design size (28 -> 29, 16 -> 17, ...). 0 = the design sizes.
const FONT_STEP = 0;

// Font size, rounded to a real pixel.
export const fs = size => PixelRatio.roundToNearestPixel(ms(size + FONT_STEP));

export const getGridColumns = () => (isTablet ? 3 : 2);
