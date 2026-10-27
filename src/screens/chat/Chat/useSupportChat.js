import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupportChatUrl } from '../../../api/services/support.api';

// The support chat page and how it's going (as the web's SupportWidget):
//   url      - the chat page (with the user's pass when signed in), null while preparing
//   loading  - true until the chat page has drawn the first time
//   failed   - the page couldn't load (offline, server down)
// onLoaded() / onFailed(): from the web viewer; retry(): load it again.
// Returns { url, attempt (a new web viewer per try), loading, failed, onLoaded, onFailed, retry }.
export default function useSupportChat() {
  const [url, setUrl] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    setUrl(null);
    setLoading(true);
    setFailed(false);
    getSupportChatUrl().then(next => alive.current && setUrl(next));
    return () => {
      alive.current = false;
    };
  }, [attempt]);

  const onLoaded = useCallback(() => setLoading(false), []);
  const onFailed = useCallback(() => {
    setFailed(true);
    setLoading(false);
  }, []);
  const retry = useCallback(() => setAttempt(n => n + 1), []);

  return { url, attempt, loading, failed, onLoaded, onFailed, retry };
}
