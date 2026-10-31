import { PermissionsAndroid, Platform } from 'react-native';
import { showPermissionOff } from '../store/permissionStore';

// Asks for an Android permission; resolves true when it's granted. A plain
// "Deny" can be asked again next time, so it's left at that. "Don't ask again"
// (or turned off in Settings) can't be asked any more: the app then explains
// it and offers to open Settings (PermissionDialog).
// kind: 'camera' | 'microphone' (the dialog's text). iOS asks by itself: true.
export const askAndroidPermission = async (permission, kind, rationale) => {
  if (Platform.OS !== 'android') {
    return true;
  }
  const result = await (rationale
    ? PermissionsAndroid.request(permission, rationale)
    : PermissionsAndroid.request(permission));
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    showPermissionOff(kind);
  }
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

// The image picker's answer when the camera / photos aren't allowed (iOS):
// explain it (PermissionDialog). Returns true when that was the problem.
export const pickerPermissionOff = (result, kind) => {
  if (result?.errorCode !== 'permission') {
    return false;
  }
  showPermissionOff(kind);
  return true;
};
