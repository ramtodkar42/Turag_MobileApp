/**
 * @format
 */

import Geolocation from '@react-native-community/geolocation';
import { findNearDuplicate } from '../src/vendor/selfInspectionLogic';
import { grayscaleOf, photoDhash, shrinkGray } from '../src/utils/photoDhash';
import { getPhotoLocation, resetPhotoLocation, warmPhotoLocation } from '../src/utils/photoLocation';

// A fake native image: 36x32 RGBA pixels from a brightness function.
let mockPixel = () => 0;
jest.mock('react-native-nitro-image', () => ({
  loadImage: jest.fn(async () => ({
    resizeAsync: async (w, h) => ({
      toRawPixelDataAsync: async () => {
        const data = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const v = mockPixel(x, y);
            data.set([v, v, v, 255], (y * w + x) * 4);
          }
        }
        return { buffer: data.buffer, width: w, height: h, pixelFormat: 'RGBA' };
      },
    }),
  })),
}));

describe('near-duplicate fingerprint (the web dHash)', () => {
  test('reads grey levels for RGBA and BGRA, with padded rows', () => {
    // 2x1 image, rows padded to 12 bytes.
    const rgba = new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255, 9, 9, 9, 9]);
    const bgra = new Uint8Array([0, 0, 255, 255, 255, 0, 0, 255, 9, 9, 9, 9]);
    const a = grayscaleOf({ buffer: rgba.buffer, width: 2, height: 1, pixelFormat: 'RGBA' });
    const b = grayscaleOf({ buffer: bgra.buffer, width: 2, height: 1, pixelFormat: 'BGRA' });
    expect(a).toEqual(b);
    expect(a[0]).toBeCloseTo(0.299 * 255);
    expect(a[1]).toBeCloseTo(0.114 * 255);
    expect(grayscaleOf({ buffer: rgba.buffer, width: 2, height: 1, pixelFormat: 'unknown' })).toBeNull();
  });

  test('averages blocks when shrinking', () => {
    expect(shrinkGray([0, 4, 8, 12], 1, 1, 2)).toEqual([6]);
  });

  test('the same view gives a near match; a different view does not', async () => {
    mockPixel = x => x * 7; // brighter to the right
    const a = await photoDhash({ uri: 'file:///a.jpg' });
    mockPixel = x => x * 7 + 3; // same view, slightly brighter
    const b = await photoDhash({ uri: 'file:///b.jpg' });
    mockPixel = x => 255 - x * 7; // the opposite picture
    const c = await photoDhash({ uri: 'file:///c.jpg' });
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(findNearDuplicate(b, [{ hash: a, label: 'WALK_FRONT' }])).toMatchObject({ label: 'WALK_FRONT' });
    expect(findNearDuplicate(c, [{ hash: a, label: 'WALK_FRONT' }])).toBeNull();
  });

  test('anything unreadable is skipped (null), never an error', async () => {
    expect(await photoDhash({ uri: 'content://media/1' })).toBeNull();
    expect(await photoDhash(null)).toBeNull();
    require('react-native-nitro-image').loadImage.mockRejectedValueOnce(new Error('bad file'));
    expect(await photoDhash({ uri: 'file:///broken.jpg' })).toBeNull();
  });
});

describe('photo location (best effort, as the web)', () => {
  beforeEach(() => {
    resetPhotoLocation();
    Geolocation.getCurrentPosition.mockClear();
  });

  test('gives the position, reused for a minute', async () => {
    expect(await getPhotoLocation()).toEqual({ lat: 18.559, lng: 73.7868, accuracyM: 10 });
    expect(await getPhotoLocation()).toEqual({ lat: 18.559, lng: 73.7868, accuracyM: 10 });
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  test('permission refused: no location, and it is not asked again', async () => {
    Geolocation.getCurrentPosition.mockImplementationOnce((ok, fail) => fail({ code: 1 }));
    expect(await getPhotoLocation()).toBeUndefined();
    warmPhotoLocation();
    expect(await getPhotoLocation()).toBeUndefined();
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  test('no fix in time: the upload does not wait for it', async () => {
    Geolocation.getCurrentPosition.mockImplementationOnce(() => {}); // never answers
    expect(await getPhotoLocation(20)).toBeUndefined();
  });
});
