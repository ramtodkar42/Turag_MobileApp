import { launchImageLibrary } from 'react-native-image-picker';

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
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'Could not open the gallery.');
  }
  return result.assets?.[0] ?? null;
};
