import { useCallback, useState } from 'react';
import ConfirmDialog from '../components/feedback/ConfirmDialog';

// Show an app-styled confirmation from any screen:
//   const { confirm, dialog } = useConfirmDialog();
//   confirm({ title, message, confirmLabel, onConfirm: async () => {...} });
//   ...render {dialog} once in the screen.
// The confirm button shows a spinner while `onConfirm` runs, then closes.
export default function useConfirmDialog() {
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback(next => setOptions(next), []);
  const close = useCallback(() => setOptions(null), []);

  const onConfirm = async () => {
    setLoading(true);
    try {
      await options?.onConfirm?.();
    } finally {
      setLoading(false);
      setOptions(null);
    }
  };

  const dialog = (
    <ConfirmDialog
      visible={!!options}
      title={options?.title}
      message={options?.message}
      icon={options?.icon}
      confirmLabel={options?.confirmLabel}
      cancelLabel={options?.cancelLabel}
      onConfirm={onConfirm}
      onCancel={close}
      loading={loading}
    />
  );

  return { confirm, dialog };
}
