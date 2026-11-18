import { useMemo, useState } from 'react';
import { NoticeRow } from '../../../../components';
import { useT } from '../../../../i18n';
import { useSignedIn } from '../../../../store/userStore';
import { hasOpenSelfInspection, useGarage } from '../../../../store/garageStore';

// Closing it hides it until the app is next opened.
let hiddenThisRun = false;

// "Pick up where you left off", first thing on Home: one light row - a short message,
// a small "View" and a close X - when the owner has an AI self-inspection still open
// (in progress, or done and waiting for its payment). The whole row opens the Garage,
// where each one waits with its Continue button. Nothing for guests, or when none is open.
// onOpenGarage(): open the Garage.
function ContinueInspectionCard({ onOpenGarage, style }) {
  const t = useT();
  const signedIn = useSignedIn();
  const garage = useGarage();
  const open = useMemo(() => garage.filter(hasOpenSelfInspection), [garage]);
  const [hidden, setHidden] = useState(hiddenThisRun);
  if (!signedIn || hidden || open.length === 0) return null;

  let message;
  if (open.length > 1) {
    message = t('home.continue.many', { count: open.length });
  } else {
    message = t(open[0].phase === 'payment_pending' ? 'home.continue.paymentPending' : 'garage.phase.resumeSelf');
  }
  const hide = () => {
    hiddenThisRun = true;
    setHidden(true);
  };

  return (
    <NoticeRow
      icon="car"
      message={message}
      actionLabel={t('home.continue.view')}
      onPress={onOpenGarage}
      onClose={hide}
      closeLabel={t('home.continue.hide')}
      accessibilityHint={t('home.continue.viewHint')}
      style={style}
    />
  );
}

export default ContinueInspectionCard;
