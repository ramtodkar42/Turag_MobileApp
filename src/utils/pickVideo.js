import { PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

// The app declares CAMERA, so Android refuses the system camera until it's
// granted. Resolves true when the camera can be used.
export const ensureCameraPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

// A short video (e.g. the self-inspection's dashboard video, MP4 / MOV):
// recorded with the phone's camera or chosen from the gallery. Resolves to
// { uri, type, fileName, fileSize, duration } or null when cancelled.
const VIDEO = { mediaType: 'video', videoQuality: 'medium', durationLimit: 60, selectionLimit: 1 };

const firstAsset = (result, fallbackType) => {
  if (result.didCancel) {
    return null;
  }
  if (result.errorCode) {
    throw new Error(result.errorMessage || result.errorCode);
  }
  const asset = result.assets?.[0];
  return asset ? { ...asset, type: asset.type || fallbackType } : null;
};

export const recordVideo = async () => {
  if (!(await ensureCameraPermission())) {
    throw new Error('camera_permission');
  }
  return firstAsset(await launchCamera({ ...VIDEO, saveToPhotos: false }), 'video/mp4');
};

export const pickVideoFromGallery = async () => firstAsset(await launchImageLibrary(VIDEO), 'video/mp4');

// A photo with its base64 (to be read by AI): from the camera or the gallery.
const PHOTO = { mediaType: 'photo', includeBase64: true, quality: 0.8, maxWidth: 1600, maxHeight: 1600, selectionLimit: 1 };

export const takePhotoWithBase64 = async () => {
  if (!(await ensureCameraPermission())) {
    throw new Error('camera_permission');
  }
  return firstAsset(await launchCamera({ ...PHOTO, saveToPhotos: false }), 'image/jpeg');
};

export const pickPhotoWithBase64 = async () => firstAsset(await launchImageLibrary(PHOTO), 'image/jpeg');
