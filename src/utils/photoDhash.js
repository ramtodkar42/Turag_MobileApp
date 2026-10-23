import { dhashGrayscale } from '../vendor/selfInspectionLogic';

// The web's near-duplicate photo check (lib/photo-dhash fileToDhash), on the
// phone: the photo is shrunk to a tiny 9x8 grey picture and turned into a
// 64-bit fingerprint (the web's own dhashGrayscale). Two photos of the same
// view give almost the same fingerprint (compare with findNearDuplicate).
//
// Advisory only and fail-open, as on the web: anything that can't be read
// resolves null and the upload carries on.

const W = 9;
const H = 8;
// Shrink to 4x the target first, then average each 4x4 block - a smoother
// result than one big jump down (close to what the browser's canvas does).
const STEP = 4;

// Byte offsets of red, green and blue in one pixel, per Nitro Image format.
const CHANNELS = {
  RGBA: [0, 1, 2, 4],
  RGBX: [0, 1, 2, 4],
  BGRA: [2, 1, 0, 4],
  BGRX: [2, 1, 0, 4],
  ARGB: [1, 2, 3, 4],
  XRGB: [1, 2, 3, 4],
  ABGR: [3, 2, 1, 4],
  XBGR: [3, 2, 1, 4],
  RGB: [0, 1, 2, 3],
  BGR: [2, 1, 0, 3],
};

// Grey level of every pixel of a small raw image, row by row.
export const grayscaleOf = ({ buffer, width, height, pixelFormat }) => {
  const layout = CHANNELS[pixelFormat];
  if (!layout || !width || !height) return null;
  const [r, g, b, bytesPerPixel] = layout;
  const data = new Uint8Array(buffer);
  // Rows can be padded, so step by the real row length.
  const rowBytes = Math.floor(data.length / height);
  if (rowBytes < width * bytesPerPixel) return null;
  const gray = new Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * rowBytes + x * bytesPerPixel;
      gray[y * width + x] = 0.299 * data[i + r] + 0.587 * data[i + g] + 0.114 * data[i + b];
    }
  }
  return gray;
};

// Averages blocks of `step` x `step` pixels: (w*step x h*step) -> (w x h).
export const shrinkGray = (gray, w, h, step) => {
  const srcW = w * step;
  const out = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = 0; dy < step; dy++) {
        for (let dx = 0; dx < step; dx++) {
          sum += gray[(y * step + dy) * srcW + x * step + dx];
        }
      }
      out[y * w + x] = sum / (step * step);
    }
  }
  return out;
};

// Fingerprint of a photo file ({ uri } from the camera or the gallery), or null.
export const photoDhash = async file => {
  try {
    const uri = file?.uri;
    if (!uri || !/^(file:\/\/|\/)/.test(uri)) return null;
    // Loaded on first use: the native image library is only needed here.
    const { loadImage } = require('react-native-nitro-image');
    const image = await loadImage({ filePath: uri });
    const small = await image.resizeAsync(W * STEP, H * STEP);
    const raw = await small.toRawPixelDataAsync();
    const gray = grayscaleOf(raw);
    if (!gray || raw.width !== W * STEP || raw.height !== H * STEP) return null;
    return dhashGrayscale(shrinkGray(gray, W, H, STEP), W, H);
  } catch {
    return null;
  }
};
