import { useEffect, useRef, useState } from 'react';
import { rememberAvatarFile, uploadMyAvatar } from '../../../api/services/profile.api';
import { updateSession } from '../../../api/session';
import { getUser, setUser } from '../../../store/userStore';
import { pickProfilePhoto } from '../../../utils/pickImage';
import { tNow } from '../../../i18n';

// Let the photo sheet finish closing before the camera / gallery opens.
const AFTER_SHEET_MS = 350;
// How long "Photo updated" shows after a save.
const SAVED_MS = 2500;

// Change the profile photo (as the web's Account page): take a selfie or pick
// one, then save it on the account - it then shows on every phone and on the
// web. While it saves, the picked photo is shown dimmed under a progress ring
// (not the old one); once saved it stays, and "Photo updated" shows briefly.
// Returns { change(source 'camera' | 'gallery'), uploading, preview (the photo
// being saved), saved, error, retry() }.
export default function useProfilePhoto() {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const lastFile = useRef(null);
  const savedTimer = useRef(null);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
      clearTimeout(savedTimer.current);
    },
    [],
  );

  const save = async file => {
    busy.current = true;
    lastFile.current = file;
    setUploading(true);
    setPreview({ uri: file.uri });
    setSaved(false);
    setError('');
    try {
      const current = getUser();
      const updated = await uploadMyAvatar(file, { phone: current?.contact });
      // The new photo shows straight from the picked file (no download wait).
      rememberAvatarFile(updated.avatarUrl, file.uri);
      // Keep what only the phone knows (e.g. the typed number), take the new photo.
      const merged = { ...current, ...updated, contact: current?.contact ?? updated.contact };
      setUser(merged);
      updateSession({ user: merged });
      lastFile.current = null;
      if (mounted.current) {
        setSaved(true);
        clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => mounted.current && setSaved(false), SAVED_MS);
      }
    } catch (e) {
      if (mounted.current) {
        setError(e?.message || tNow('profile.photo.error'));
      }
    } finally {
      busy.current = false;
      if (mounted.current) {
        setUploading(false);
        setPreview(null);
      }
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

  // Saving failed: try the same photo again.
  const retry = () => {
    if (!busy.current && lastFile.current) {
      save(lastFile.current);
    }
  };

  return { change, uploading, preview, saved, error, retry, canRetry: !!error && !!lastFile.current };
}
