import { useCallback, useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../../../api/services/chat.api';
import { tNow } from '../../../i18n';

let nextId = 0;
const createId = () => `m${Date.now()}-${nextId++}`;

// Chat state. `messages` is newest-first (for the inverted list).
// message: { id, role: 'user' | 'bot', text, image?, failed? }
export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const add = message => setMessages(prev => [{ id: createId(), ...message }, ...prev]);

  const send = useCallback(async ({ text = '', image = null }) => {
    const clean = text.trim();
    if (!clean && !image) {
      return;
    }
    add({ role: 'user', text: clean, image });
    setTyping(true);
    try {
      const reply = await sendChatMessage({ text: clean, image });
      if (mounted.current) {
        add({ role: 'bot', text: reply.text, image: reply.image });
      }
    } catch (e) {
      if (mounted.current) {
        add({ role: 'bot', text: e.message || tNow('errors.generic'), failed: true });
      }
    } finally {
      if (mounted.current) {
        setTyping(false);
      }
    }
  }, []);

  return { messages, typing, send };
}
