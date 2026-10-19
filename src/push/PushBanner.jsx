import { InAppBanner } from '../components';
import { useT } from '../i18n';
import { hideBanner, useBanner } from './bannerStore';
import { openPushLink } from './pushNotifications';

// The banner for a push that arrives while the app is open; tapping it opens
// the push's page (same as tapping it in the phone's notification bar).
function PushBanner() {
  const t = useT();
  const banner = useBanner();
  return (
    <InAppBanner
      banner={banner}
      onPress={() => openPushLink(banner?.link)}
      onHide={hideBanner}
      accessibilityHint={t('notifications.bannerHint')}
    />
  );
}

export default PushBanner;
