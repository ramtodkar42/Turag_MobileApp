// How long a recorded clip is, in seconds (checked against the slot's limits, as
// the web reads the length from the file):
// - the recorder stopped it at the limit ('max-duration-reached'): exactly the limit;
// - otherwise the recorder's own count of what's in the file (read while recording);
// - the clock only if the recorder gave no count.
// A stopwatch alone also counts the camera starting and the file being finished,
// so a clip stopped at the limit could be refused as too long.
export const clipLength = ({ reason, maxS, recordedSeconds, clockSeconds }) => {
  if (reason === 'max-duration-reached' && maxS) return maxS;
  return recordedSeconds > 0 ? recordedSeconds : clockSeconds;
};
