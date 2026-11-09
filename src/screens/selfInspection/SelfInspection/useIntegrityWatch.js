import { useCallback, useEffect, useRef } from 'react';
import { listSelfInspectionMedia } from '../../../api/services/selfInspection.api';
import { describeMediaIntegrity } from '../../../vendor/selfInspectionLogic';

const POLL_ROUNDS = 8;
const POLL_MS = 1500;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// The server checks each photo a moment after upload. This asks for the result for a
// short while, so the user hears about a flagged photo while a retake is still free
// (the web's live integrity flag). A warning only: the check at submit is the real one.
// Returns watch(mediaId). One loop serves every photo waiting, and a new photo gives it
// more time. onFlagged(mediaRow) is called for a photo that failed.
export default function useIntegrityWatch(inspectionId, onFlagged) {
  const pending = useRef(new Set());
  const roundsLeft = useRef(0);
  const running = useRef(false);
  const alive = useRef(true);
  const report = useRef(onFlagged);
  report.current = onFlagged;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  return useCallback(
    async mediaId => {
      pending.current.add(mediaId);
      roundsLeft.current = POLL_ROUNDS;
      if (running.current) return;
      running.current = true;
      try {
        while (alive.current && pending.current.size > 0 && roundsLeft.current > 0) {
          roundsLeft.current -= 1;
          await wait(POLL_MS);
          if (!alive.current) return;
          const media = await listSelfInspectionMedia(inspectionId);
          if (!alive.current) return;
          for (const mv of media) {
            if (!pending.current.has(mv.id) || !mv.integrity) continue;
            pending.current.delete(mv.id);
            if (describeMediaIntegrity(mv).failed) report.current(mv);
          }
        }
      } catch {
        // The same flags appear at submit.
      } finally {
        pending.current.clear();
        running.current = false;
      }
    },
    [inspectionId],
  );
}
