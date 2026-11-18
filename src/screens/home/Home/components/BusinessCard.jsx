import { NoticeRow } from '../../../../components';
import { useT } from '../../../../i18n';
import useMyOrganizations from '../../../../hooks/useMyOrganizations';

// For members of a business (dealer, lender, yard): their part of the app, first thing
// on Home every time the app opens (the web keeps it in its side menu). The same light
// row as "pick up where you left off": just the portal's name ("Dealer dashboard") and
// a small "Open". The whole row opens Business accounts. No close X: it's the dealer's
// way in, so it always stays. Nothing for everyone else.
// onOpen(): open Business accounts.
function BusinessCard({ onOpen, style }) {
  const t = useT();
  const { orgs, loading } = useMyOrganizations();
  if (loading || orgs.length === 0) return null;

  const single = orgs.length === 1 ? orgs[0] : null;
  const dealer = single?.portal === 'DEALER';
  let title = t('business.home.title');
  if (single) title = t(dealer ? 'business.dealer.title' : 'business.home.openInstitutional');

  return (
    <NoticeRow
      icon={dealer ? 'store' : 'bank'}
      message={title}
      actionLabel={t('home.business.open')}
      onPress={onOpen}
      accessibilityHint={t('home.business.hint')}
      style={style}
    />
  );
}

export default BusinessCard;
