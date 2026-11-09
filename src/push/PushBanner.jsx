import { InAppBanner } from '../components';
import { useT } from '../i18n';
import { hideBanner, useBanner } from './bannerStore';
import { openPushLink } from './pushNotifications';

// The banner on top of every screen: a push that arrives while the app is open
// (tapping it opens the push's page, same as in the phone's notification bar),
// or a message from the app (tapping it does what the message offers).
function PushBanner() {
  const t = useT();
  const banner = useBanner();
  return (
    <InAppBanner
      banner={banner}
      onPress={() => (banner?.onPress ? banner.onPress() : openPushLink(banner?.link))}
      onHide={hideBanner}
      accessibilityHint={banner?.hint ?? t('notifications.bannerHint')}
    />
  );
}

export default PushBanner;
