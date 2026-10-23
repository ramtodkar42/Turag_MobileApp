import { useRef, useState } from 'react';
import { uploadMyAvatar } from '../../../api/services/profile.api';
import { updateSession } from '../../../api/session';
import { getUser, setUser } from '../../../store/userStore';
import { pickProfilePhoto } from '../../../utils/pickImage';
import { tNow } from '../../../i18n';

// Let the photo sheet finish closing before the camera / gallery opens.
const AFTER_SHEET_MS = 350;

// Change the profile photo (as the web's Account page): take a selfie or pick
// one, then save it on the account - it then shows on every phone and on the
// web. Returns { change(source 'camera' | 'gallery'), uploading, error }.
export default function useProfilePhoto() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const save = async file => {
    busy.current = true;
    setUploading(true);
    setError('');
    try {
      const current = getUser();
      const updated = await uploadMyAvatar(file, { phone: current?.contact });
      // Keep what only the phone knows (e.g. the typed number), take the new photo.
      const merged = { ...current, ...updated, contact: current?.contact ?? updated.contact };
      setUser(merged);
      updateSession({ user: merged });
    } catch (e) {
      setError(e?.message || tNow('profile.photo.error'));
    } finally {
      busy.current = false;
      setUploading(false);
    }
  };

  const change = source => {
    if (busy.current) {
      return;
    }
    setTimeout(async () => {
      let file;
      try {
        file = await pickProfilePhoto(source);
      } catch (e) {
        setError(e?.message === 'camera_permission' ? tNow('verify.error.camera') : tNow('profile.photo.pickError'));
        return;
      }
      if (file) {
        await save(file);
      }
    }, AFTER_SHEET_MS);
  };

  return { change, uploading, error };
}
