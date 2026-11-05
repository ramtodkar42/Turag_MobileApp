import useInAppUpdate from '../../hooks/useInAppUpdate';
import { useT } from '../../i18n';
import Snackbar from './Snackbar';

// An update has finished downloading (Google Play's in-app update, Android): stays
// until the user restarts or closes it. If closed, it installs on a later open.
function AppUpdatePrompt() {
  const t = useT();
  const update = useInAppUpdate();
  if (!update.ready) return null;
  return (
    <Snackbar
      persist
      text={t('common.updateReady')}
      actionLabel={t('common.updateRestart')}
      onAction={update.install}
      onDone={update.dismiss}
    />
  );
}

export default AppUpdatePrompt;
