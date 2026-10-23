import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { AppText, Header, ScreenContainer } from '../../../components';
import { spacing } from '../../../theme';
import useRemoteData from '../../../hooks/useRemoteData';
import { setMyOrganizations } from '../../../hooks/useMyOrganizations';
import { getMyOrganizations } from '../../../api/services/business.api';
import { useT } from '../../../i18n';
import RemoteList from '../components/RemoteList';
import RowCard from '../components/RowCard';
import { BUSINESS_ROUTES } from '../routes';
import { labelOr, orgStatus } from '../statuses';

// Business accounts: the organizations the user belongs to (dealer, lender,
// yard), each with its type and status. A dealer org opens the dealer
// marketplace; a lender / yard org the institutional portal. Orgs that
// aren't active yet can't be opened (the backend refuses them).
function BusinessHome({ navigation }) {
  const t = useT();
  const remote = useRemoteData(async () => {
    const orgs = await getMyOrganizations();
    // Keep the shared list (Profile's row) in step with what's shown here.
    setMyOrganizations(orgs);
    return orgs;
  });

  const open = useCallback(
    org =>
      navigation.navigate(org.portal === 'DEALER' ? BUSINESS_ROUTES.DEALER : BUSINESS_ROUTES.INSTITUTIONAL, { org }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const status = orgStatus(item.status);
      return (
        <RowCard
          title={item.name}
          badge={{ label: labelOr(t, status.labelKey, item.status), tone: status.tone }}
          lines={[
            `${labelOr(t, `business.orgType.${item.type}`, item.type)} · ${labelOr(t, `business.role.${item.role}`, item.role)}`,
            item.active
              ? t(item.portal === 'DEALER' ? 'business.home.openDealer' : 'business.home.openInstitutional')
              : t('business.home.notActive'),
          ]}
          onPress={item.active ? () => open(item) : undefined}
        />
      );
    },
    [open, t],
  );

  return (
    <ScreenContainer header={<Header onBack={navigation.goBack} title={t('business.home.title')} />}>
      <RemoteList
        remote={remote}
        keyExtractor={item => item.membershipId ?? item.id}
        renderItem={renderItem}
        header={
          <AppText variant="subtitle" style={styles.intro}>
            {t('business.home.intro')}
          </AppText>
        }
        empty={{ title: t('business.home.empty.title'), message: t('business.home.empty.message') }}
        errorTitle={t('business.home.error')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: spacing.sm,
  },
});

export default BusinessHome;
