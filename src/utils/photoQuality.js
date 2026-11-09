import { measureGrey, qualityWarnings } from '../vendor/selfInspectionLogic';
import { grayscaleOf } from './photoDhash';

// Measured on a small copy, so every camera's resolution compares alike (as the web).
const SAMPLE_EDGE = 256;

// The web's photo quality check, on the phone: ['DARK' | 'BRIGHT' | 'BLURRY'] for a
// photo file ({ uri }). Advisory only and fail-open: a photo that can't be read gets no
// warning, never a false one, and the upload carries on either way.
export const photoQualityWarnings = async file => {
  try {
    const uri = file?.uri;
    if (!uri || !/^(file:\/\/|\/)/.test(uri)) return [];
    // Loaded on first use: the native image library is only needed here.
    const { loadImage } = require('react-native-nitro-image');
    const image = await loadImage({ filePath: uri });
    const scale = Math.min(1, SAMPLE_EDGE / Math.max(image.width, image.height));
    const small = await image.resizeAsync(
      Math.max(1, Math.round(image.width * scale)),
      Math.max(1, Math.round(image.height * scale)),
    );
    const raw = await small.toRawPixelDataAsync();
    const gray = grayscaleOf(raw);
    return gray ? qualityWarnings(measureGrey(gray, raw.width, raw.height)) : [];
  } catch {
    return [];
  }
};
