// How hard the recorder compresses a clip, so even the longest one is small enough to
// send. Production storage (Supabase) takes up to 50 MB a file by default, and a
// 2-minute walkaround at 4 Mbit/s came to about 60 MB: refused at the very end of its
// upload. A clip is aimed at MAX_CLIP_BYTES at its longest, which leaves room for the
// sound and for phones whose encoder runs over its target. Short clips (the engine
// start, 45 s at most) keep the full 4 Mbit/s.
const BEST = 4 * 1000 * 1000;
const LOWEST = 1500 * 1000;
const SOUND = 192 * 1000; // the most the sound track takes
const MAX_CLIP_BYTES = 36 * 1024 * 1024;

// maxS: the item's longest clip in seconds (none: the full rate). -> bits per second.
export const videoBitRate = maxS => {
  if (!(maxS > 0)) return BEST;
  const fits = Math.floor((MAX_CLIP_BYTES * 8) / maxS) - SOUND;
  return Math.max(LOWEST, Math.min(BEST, fits));
};
