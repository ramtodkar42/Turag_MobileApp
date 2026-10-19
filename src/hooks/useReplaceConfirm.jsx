import { useCallback } from 'react';
import Icon from '../components/icons/Icon';
import { colors } from '../theme';
import { ms } from '../utils/responsive';
import { tNow } from '../i18n';
import useConfirmDialog from './useConfirmDialog';

// The dialog fades out before the camera / gallery opens: on iOS a picker
// can't be presented while another modal is still closing.
const AFTER_DIALOG_MS = 350;

const TEXT = {
  photo: {
    title: 'common.replace.photoTitle',
    message: 'common.replace.photoMessage',
    confirm: 'common.replace.retake',
  },
  document: {
    title: 'common.replace.documentTitle',
    message: 'common.replace.documentMessage',
    confirm: 'common.replace.choose',
  },
};

// "Replace this photo?" before changing an uploaded file.
//   const { askReplace, dialog } = useReplaceConfirm();
//   askReplace('photo' | 'document', () => openCamera());  ...render {dialog}
export default function useReplaceConfirm() {
  const { confirm, dialog } = useConfirmDialog();

  const askReplace = useCallback(
    (kind, action) => {
      const text = TEXT[kind] ?? TEXT.photo;
      confirm({
        title: tNow(text.title),
        message: tNow(text.message),
        confirmLabel: tNow(text.confirm),
        icon: <Icon name={kind === 'document' ? 'document' : 'camera'} size={ms(28)} color={colors.primary} />,
        onConfirm: () => {
          setTimeout(action, AFTER_DIALOG_MS);
        },
      });
    },
    [confirm],
  );

  return { askReplace, dialog };
}
