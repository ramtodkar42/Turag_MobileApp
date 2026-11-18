import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { tNow } from '../i18n';

// While a chat is open, check for new messages this often (as the web does)…
const POLL_MS = 4000;
// …and less often while the backend can't be reached.
const RETRY_MS = 10000;

// A two-party chat with short polling (the booking chat with the inspector, the
// buyer-seller order chat). key: what the thread is about (booking / order id).
// transport: {
//   load()      -> { messages: [{ id, text, mine, createdAt }] (oldest first), access? }
//   send(text)  -> the saved message
//   refuse(error) -> a message for a send the server refused for good (e.g. a phone
//                  number), or null to treat it as a failed send that can be retried
// }
// Returns {
//   messages - newest first (for an inverted list): { id, text, mine, createdAt,
//              pending?, failed? }; a sent message shows at once (pending) and is
//              swapped for the saved one; a failed one can be resent
//   access   - what the last load said about the chat (e.g. 'OPEN'), or undefined
//   loading  - the first load is running (show placeholders)
//   error    - the last load failed (first load: full-screen; later: a banner)
//   retrying - a Try again tap is running
//   refused  - { text, message } for the last refused send (the text goes back to the box)
//   retry(), send(text), resend(message), clearRefused()
// }
// Loads now, then keeps checking; coming back to the app checks at once.
export default function useChatThread(key, transport) {
  const [server, setServer] = useState([]);
  const [outbox, setOutbox] = useState([]); // not saved yet
  const [access, setAccess] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [refused, setRefused] = useState(null);
  const active = useRef(true);
  const failing = useRef(false);
  const transportRef = useRef(transport);
  transportRef.current = transport;
  // Messages sent from here: kept on screen until the server's list has them
  // (a check that started before the send would otherwise drop them for a moment).
  const sent = useRef(new Map());

  // Checks can overlap (the poll, coming back to the app, Try again): only the
  // newest one's answer is used, so a late older answer never hides a message.
  const latest = useRef(0);

  const load = useCallback(async () => {
    latest.current += 1;
    const mine = latest.current;
    try {
      const result = await transportRef.current.load();
      if (mine !== latest.current) return;
      if (active.current) {
        failing.current = false;
        result.messages.forEach(m => sent.current.delete(m.id));
        setServer([...result.messages, ...sent.current.values()]);
        setAccess(result.access);
        setError('');
      }
    } catch (e) {
      if (mine !== latest.current) return;
      if (active.current) {
        failing.current = true;
        setError(e.message || tNow('account.chat.loadError'));
      }
    } finally {
      if (active.current && mine === latest.current) {
        setLoading(false);
      }
    }
    // A new thread (another booking / order) starts over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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
        const saved = await transportRef.current.send(draft.text);
        if (!active.current) {
          return;
        }
        sent.current.set(saved.id, saved);
        setServer(prev => (prev.some(m => m.id === saved.id) ? prev : [...prev, saved]));
        setOutbox(prev => prev.filter(m => m.id !== draft.id));
      } catch (e) {
        if (!active.current) {
          return;
        }
        const reason = transportRef.current.refuse?.(e) ?? null;
        if (reason) {
          // Refused for good: take it off the screen and give the text back to edit.
          setOutbox(prev => prev.filter(m => m.id !== draft.id));
          setRefused({ text: draft.text, message: reason });
          load();
        } else {
          setOutbox(prev => prev.map(m => (m.id === draft.id ? { ...m, pending: false, failed: true } : m)));
        }
      }
    },
    [load],
  );

  const send = useCallback(
    text => {
      const body = text.trim();
      if (!body) {
        return;
      }
      setRefused(null);
      const draft = { id: `local_${Date.now()}`, text: body, mine: true, createdAt: Date.now(), pending: true };
      setOutbox(prev => [...prev, draft]);
      deliver(draft);
    },
    [deliver],
  );

  const clearRefused = useCallback(() => setRefused(null), []);

  const messages = [...server, ...outbox].reverse();
  return { messages, access, loading, error, retrying, refused, retry, send, resend: deliver, clearRefused };
}
