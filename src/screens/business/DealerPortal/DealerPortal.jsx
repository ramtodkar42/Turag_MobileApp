import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ChipTabs, Header, ScreenContainer } from '../../../components';
import { spacing } from '../../../theme';
import { useT } from '../../../i18n';
import OrgSummary from '../components/OrgSummary';
import { BUSINESS_ROUTES } from '../routes';
import DealerListings from './components/DealerListings';
import DealerStock from './components/DealerStock';

// Dealer marketplace (as the web's /dealer): the dealer org's own fixed-price
// listings - list a vehicle, withdraw one - and other dealers' live stock to
// browse. New listings start in review until Turag ops approves them.
// params: { org } (from Business home)
function DealerPortal({ navigation, route }) {
  const t = useT();
  const { org } = route.params;
  const [tab, setTab] = useState('mine');

  const top = (
    <View>
      <AppText variant="subtitle" style={styles.intro}>
        {t('business.dealer.intro')}
      </AppText>
      <OrgSummary org={org} style={styles.org} />
      <ChipTabs
        tabs={[
          { id: 'mine', label: t('business.dealer.tab.mine') },
          { id: 'browse', label: t('business.dealer.tab.browse') },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />
    </View>
  );

  return (
    <ScreenContainer
      header={<Header onBack={navigation.goBack} title={t('business.dealer.title')} />}
      footer={
        tab === 'mine' ? (
          <Button
            title={t('business.dealer.listVehicle')}
            onPress={() => navigation.navigate(BUSINESS_ROUTES.DEALER_CREATE, { org })}
          />
        ) : null
      }
    >
      {tab === 'mine' ? <DealerListings orgId={org.id} top={top} /> : <DealerStock top={top} />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: spacing.sm,
  },
  org: {
    marginTop: spacing.md,
  },
  tabs: {
    marginTop: spacing.md,
    flexGrow: 0,
  },
});

export default DealerPortal;
