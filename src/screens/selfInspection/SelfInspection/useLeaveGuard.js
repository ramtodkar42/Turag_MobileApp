import { useEffect, useRef } from 'react';

const BACK_ACTIONS = new Set(['GO_BACK', 'POP']);

// Keeps "back" (header arrow, Android back button) inside the wizard while
// `enabled`: onBack() moves a step back and returns true, or returns false on
// the first step - then confirmLeave(leave) asks before the screen closes.
// Other ways of leaving (sign-out, "Back to my jobs") are never blocked.
export default function useLeaveGuard({ navigation, enabled, onBack, confirmLeave }) {
  const latest = useRef({ enabled, onBack, confirmLeave });
  latest.current = { enabled, onBack, confirmLeave };
  const allowed = useRef(false);

  useEffect(() => {
    if (!navigation.addListener) {
      return undefined;
    }
    return navigation.addListener('beforeRemove', e => {
      const guard = latest.current;
      if (allowed.current || !guard.enabled || !BACK_ACTIONS.has(e.data.action.type)) {
        return;
      }
      e.preventDefault();
      if (guard.onBack()) {
        return;
      }
      guard.confirmLeave(() => {
        allowed.current = true;
        navigation.dispatch(e.data.action);
      });
    });
  }, [navigation]);
}
