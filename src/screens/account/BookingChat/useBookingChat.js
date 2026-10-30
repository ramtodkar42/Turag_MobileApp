import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getBookingMessages, sendBookingMessage } from '../../../api/services/booking.api';
import { tNow } from '../../../i18n';

// While the chat is open, check for new messages this often (as the web does)…
const POLL_MS = 4000;
// …and less often while the backend can't be reached.
const RETRY_MS = 10000;

// Chat about a booking.
// Returns {
//   messages - newest first (for an inverted list): { id, text, mine, createdAt,
//              pending?, failed? }; a sent message shows at once (pending) and is
//              swapped for the saved one; a failed one can be resent
//   loading  - the first load is running (show placeholders)
//   error    - the last load failed (first load: full-screen; later: a banner)
//   retrying - a Try again tap is running
//   retry(), send(text), resend(message)
// }
// Loads now, then keeps checking; coming back to the app checks at once.
export default function useBookingChat(bookingId) {
  const [server, setServer] = useState([]);
  const [outbox, setOutbox] = useState([]); // not saved yet
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const active = useRef(true);
  const failing = useRef(false);
  // Messages sent from here: kept on screen until the server's list has them
  // (a check that started before the send would otherwise drop them for a moment).
  const sent = useRef(new Map());

  const load = useCallback(async () => {
    try {
      const list = await getBookingMessages(bookingId);
      if (active.current) {
        failing.current = false;
        list.forEach(m => sent.current.delete(m.id));
        setServer([...list, ...sent.current.values()]);
        setError('');
      }
    } catch (e) {
      if (active.current) {
        failing.current = true;
        setError(e.message || tNow('account.chat.loadError'));
      }
    } finally {
      if (active.current) {
        setLoading(false);
      }
    }
  }, [bookingId]);

  useEffect(() => {
    active.current = true;
    let timer = null;
    // Each check plans the next one: sooner when fine, later while failing.
    const tick = async () => {
      await load();
      if (active.current) {
        timer = setTimeout(tick, failing.current ? RETRY_MS : POLL_MS);
      }
    };
    tick();
    const appState = AppState.addEventListener('change', next => next === 'active' && load());
    return () => {
      active.current = false;
      clearTimeout(timer);
      appState.remove();
    };
  }, [load]);

  // "Try again": check now, showing that it's happening.
  const retry = useCallback(async () => {
    setRetrying(true);
    await load();
    if (active.current) {
      setRetrying(false);
    }
  }, [load]);

  const deliver = useCallback(
    async draft => {
      setOutbox(prev => prev.map(m => (m.id === draft.id ? { ...m, pending: true, failed: false } : m)));
      try {
        const saved = await sendBookingMessage(bookingId, draft.text);
        if (!active.current) {
          return;
        }
        sent.current.set(saved.id, saved);
        setServer(prev => (prev.some(m => m.id === saved.id) ? prev : [...prev, saved]));
        setOutbox(prev => prev.filter(m => m.id !== draft.id));
      } catch {
        if (active.current) {
          setOutbox(prev => prev.map(m => (m.id === draft.id ? { ...m, pending: false, failed: true } : m)));
        }
      }
    },
    [bookingId],
  );

  const send = useCallback(
    text => {
      const body = text.trim();
      if (!body) {
        return;
      }
      const draft = { id: `local_${Date.now()}`, text: body, mine: true, createdAt: Date.now(), pending: true };
      setOutbox(prev => [...prev, draft]);
      deliver(draft);
    },
    [deliver],
  );

  const messages = [...server, ...outbox].reverse();
  return { messages, loading, error, retrying, retry, send, resend: deliver };
}
