import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { ensureCameraPermission } from './pickVideo';
import { pickerPermissionOff } from './permissions';

// Opens the system gallery and returns the chosen photo
// ({ uri, type, fileName, fileSize, width, height }), or null if cancelled.
// Uses the OS photo picker, so no storage permission prompt on Android.
export const pickImageFromGallery = async () => {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    quality: 0.8,
    maxWidth: 1080,
    maxHeight: 1080,
  });

  if (result.didCancel) {
    return null;
  }
  if (pickerPermissionOff(result, 'photos')) {
    throw new Error('camera_permission');
  }
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'Could not open the gallery.');
  }
  return result.assets?.[0] ?? null;
};

// A profile photo, from the selfie camera or the gallery (source 'camera' |
// 'gallery'): small and square-ish (the account keeps a little JPEG, max 512 KB),
// so it's resized here. Returns the photo like pickImageFromGallery, or null.
// Throws 'camera_permission' when the camera isn't allowed.
const AVATAR_SIZE = 512;

// The account keeps only JPEG photos (the server checks the bytes; the web always
// re-encodes too), but the gallery can hand back a PNG (screenshots), HEIC or WebP.
// So the picked photo is saved again as a JPEG. If that can't be done on this
// phone, the original is kept (a JPEG still uploads; anything else gets the
// server's "choose a JPG" message, as before).
const AVATAR_JPEG_QUALITY = 85;
const asJpeg = async asset => {
  try {
    // Loaded on first use: the native image library is only needed here.
    const { loadImage } = require('react-native-nitro-image');
    const image = await loadImage({ filePath: asset.uri });
    const path = await image.saveToTemporaryFileAsync('jpg', AVATAR_JPEG_QUALITY);
    const name = String(asset.fileName || 'profile').replace(/\.[^.]*$/, '');
    return {
      ...asset,
      uri: `file://${String(path).replace(/^file:\/\//, '')}`,
      type: 'image/jpeg',
      fileName: `${name}.jpg`,
      fileSize: undefined,
    };
  } catch {
    return asset;
  }
};

export const pickProfilePhoto = async source => {
  const options = {
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: AVATAR_SIZE,
    maxHeight: AVATAR_SIZE,
  };
  let result;
  if (source === 'camera') {
    if (!(await ensureCameraPermission())) {
      throw new Error('camera_permission');
    }
    result = await launchCamera({ ...options, cameraType: 'front', saveToPhotos: false });
  } else {
    result = await launchImageLibrary({ ...options, selectionLimit: 1 });
  }
  if (result.didCancel) {
    return null;
  }
  if (pickerPermissionOff(result, source === 'camera' ? 'camera' : 'photos')) {
    throw new Error('camera_permission');
  }
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'Could not open the photo.');
  }
  const asset = result.assets?.[0];
  return asset ? asJpeg({ ...asset, type: asset.type || 'image/jpeg' }) : null;
};

// Takes a photo with the phone's camera (front: the selfie camera) and returns
// it like pickImageFromGallery, or null if cancelled. Throws 'camera_permission'
// when the camera isn't allowed.
export const takePhoto = async ({ front = false } = {}) => {
  if (!(await ensureCameraPermission())) {
    throw new Error('camera_permission');
  }
  const result = await launchCamera({
    mediaType: 'photo',
    cameraType: front ? 'front' : 'back',
    quality: 0.8,
    maxWidth: 1600,
    maxHeight: 1600,
    saveToPhotos: false,
  });
  if (result.didCancel) {
    return null;
  }
  if (pickerPermissionOff(result, 'camera')) {
    throw new Error('camera_permission');
  }
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'Could not open the camera.');
  }
  const asset = result.assets?.[0];
  return asset ? { ...asset, type: asset.type || 'image/jpeg' } : null;
};
