import { useCallback, useEffect, useState } from 'react';
import { ROUTES } from '../../../navigation/routes';
import { tNow } from '../../../i18n';
import { recordVideo } from '../../../utils/pickVideo';
import { isCameraAvailable } from '../../../utils/visionCamera';
import { warmPhotoLocation } from '../../../utils/photoLocation';
import { checkVideoDuration } from '../../../vendor/selfInspectionLogic';
import { slotKey } from './useSelfInspection';

// The server refuses a bigger video.
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

// The guided videos' state (the web's GuidedVideoCapture). Kept by the screen, so a
// recording survives moving between steps and the trip to the camera. Recorded with
// the in-app camera (a sensible size, so 2 minutes can go up on a phone network);
// a recording that's too long or too short is refused here, with the reason.
// { pending, saved, errors } by slot; record(item, shot); use(item, shot, file, have).
// recorded: the route param the camera returns: { key, file }.
export default function useGuidedVideos({ si, navigation, recorded }) {
  const [pending, setPending] = useState({});
  const [saved, setSaved] = useState({});
  const [errors, setErrors] = useState({});

  const receive = useCallback((key, file, minS, maxS) => {
    setPending(p => ({ ...p, [key]: undefined }));
    const check = checkVideoDuration(file.duration ?? Number.NaN, maxS, minS);
    let error;
    if (check === 'TOO_LONG') {
      error = tNow('selfInspection.gvideo.tooLong', { n: Math.round(file.duration), max: maxS });
    } else if (check === 'TOO_SHORT') {
      error = tNow('selfInspection.gvideo.tooShort', { n: Math.round(file.duration), min: minS });
    } else if ((file.fileSize ?? 0) > MAX_VIDEO_BYTES) {
      error = tNow('selfInspection.gvideo.tooBig');
    }
    setErrors(e => ({ ...e, [key]: error }));
    if (!error) setPending(p => ({ ...p, [key]: file }));
  }, []);

  // The in-app camera came back with a recording.
  useEffect(() => {
    if (!recorded) return;
    navigation.setParams({ recorded: undefined });
    receive(recorded.key, recorded.file, recorded.minS, recorded.maxS);
  }, [recorded, navigation, receive]);

  const record = useCallback(
    async (item, shot) => {
      const key = slotKey(item.item_code, shot);
      const minS = item.evidence_requirement?.min_duration_s;
      const maxS = item.evidence_requirement?.max_duration_s;
      warmPhotoLocation();
      si.showMsg(key, undefined);
      if (isCameraAvailable) {
        navigation.navigate(ROUTES.VIDEO_RECORDER, {
          slot: { key, title: item.label, minS, maxS },
          returnTo: ROUTES.SELF_INSPECTION,
        });
        return;
      }
      // An older build without the in-app camera: the phone's own camera app.
      try {
        const file = await recordVideo({ durationLimit: maxS });
        if (file) receive(key, file, minS, maxS);
      } catch (e) {
        setErrors(er => ({
          ...er,
          [key]: tNow(e?.message === 'camera_permission' ? 'verify.error.camera' : 'selfInspection.error.pickFailed'),
        }));
      }
    },
    [navigation, receive, si],
  );

  // Send the accepted clip. A failure keeps it, so "Use this video" can be tried again.
  const use = useCallback(
    async (item, shot, file, have) => {
      const key = slotKey(item.item_code, shot);
      const ok = await si.addEvidence(item.item_code, file, 'VIDEO', shot, have);
      if (ok) {
        setSaved(s => ({ ...s, [key]: file.uri }));
        setPending(p => ({ ...p, [key]: undefined }));
      }
      return ok;
    },
    [si],
  );

  return { pending, saved, errors, record, use };
}
