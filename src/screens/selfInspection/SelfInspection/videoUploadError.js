import { tNow } from '../../../i18n';
import { UPLOAD_REFUSED } from '../../../api/upload';

// A failed video upload, in words the owner can act on. The recording stays on the
// phone, so a dropped connection, a busy server or a refused upload just needs
// another try; one the storage finds too big needs a new recording. Anything else
// (the app needs an update, the file can't be read, the server's own reason) keeps
// its own message.
export const videoUploadErrorText = err => {
  if (err?.code === UPLOAD_REFUSED && err.status === 413) return tNow('selfInspection.gvideo.tooBig');
  if (err?.code === UPLOAD_REFUSED || err?.isNetworkError || err?.status >= 500) {
    return tNow('selfInspection.gvideo.failed');
  }
  return err?.message || tNow('selfInspection.gvideo.failed');
};
