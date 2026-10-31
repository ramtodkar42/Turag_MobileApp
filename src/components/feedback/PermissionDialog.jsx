import { Linking } from 'react-native';
import ConfirmDialog from './ConfirmDialog';
import IconTile from '../common/IconTile';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';
import { hidePermissionOff, usePermissionOff } from '../../store/permissionStore';

const ICONS = { camera: 'camera', photos: 'image', location: 'mapPin', microphone: 'mic' };

// "Camera access is off" + Open Settings / Not now: shown when the user has
// turned a permission off and the phone won't ask again (store/permissionStore).
// Mounted once in App, so every screen explains it the same way.
function PermissionDialog() {
  const t = useT();
  const kind = usePermissionOff();
  const openSettings = () => {
    hidePermissionOff();
    Linking.openSettings().catch(() => {});
  };
  return (
    <ConfirmDialog
      visible={!!kind}
      icon={kind ? <IconTile name={ICONS[kind]} size={ms(52)} /> : null}
      title={kind ? t(`common.permission.${kind}.title`) : ''}
      message={kind ? t(`common.permission.${kind}.message`) : ''}
      confirmLabel={t('common.permission.openSettings')}
      cancelLabel={t('common.notNow')}
      onConfirm={openSettings}
      onCancel={hidePermissionOff}
    />
  );
}

export default PermissionDialog;
