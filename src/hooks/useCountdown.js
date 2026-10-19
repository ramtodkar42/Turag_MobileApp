import { useCallback, useEffect, useState } from 'react';

// Counts down from `seconds`. Based on an end time, so it stays correct
// even if the app was in the background.
export default function useCountdown(seconds) {
  const [endAt, setEndAt] = useState(() => Date.now() + seconds * 1000);
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  // restart() counts `seconds` again; restart(n) counts n (e.g. a new server wait).
  const restart = useCallback(
    (next = seconds) => setEndAt(Date.now() + next * 1000),
    [seconds],
  );

  return { remaining, isDone: remaining === 0, restart };
}
