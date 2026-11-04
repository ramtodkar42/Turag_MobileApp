import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ChipTabs, Header, ScreenContainer } from '../../../components';
import { spacing } from '../../../theme';
import { FEATURES } from '../../../api/config';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import OrgSummary from '../components/OrgSummary';
import { BUSINESS_ROUTES } from '../routes';
import DealerListings from './components/DealerListings';
import DealerOffers from './components/DealerOffers';
import DealerOverview from './components/DealerOverview';
import DealerSales from './components/DealerSales';
import DealerStock from './components/DealerStock';

// The dealer-only marketplace (Browse, the dealer listing form) is the next phase;
// for now a dealer lists like any seller, and it shows here (as the web).
const tabs = () =>
  FEATURES.dealerMarketplace
    ? ['overview', 'offers', 'sales', 'mine', 'browse']
    : ['overview', 'offers', 'sales', 'mine'];

// The dealer's dashboard (as the web's /dealer, ADR-0060): Overview (what's
// waiting on you, the dealership's numbers, 12 weeks of offers and sales),
// Offers and Sales across the whole dealership, and the dealership's stock (list a
// car through the normal seller flow, withdraw one). New listings start in review
// until Turag ops approves them. Only the person who listed a car can answer its
// offers or hand it over.
// The intro, dealership and tabs stay put; a tab opened once stays loaded
// (hidden while another shows), so switching tabs never blinks or reloads.
// params: { org } (from Business home)
function DealerPortal({ navigation, route }) {
  const t = useT();
  const { org } = route.params;
  const TABS = tabs();
  const marketplace = FEATURES.dealerMarketplace;
  const [tab, setTab] = useState('overview');
  // The tabs opened so far (each loads the first time it's shown).
  const [opened, setOpened] = useState(['overview']);

  const show = next => {
    setTab(next);
    setOpened(list => (list.includes(next) ? list : [...list, next]));
  };

  const body = id => {
    switch (id) {
      case 'overview':
        return <DealerOverview orgId={org.id} onGo={show} />;
      case 'offers':
        return <DealerOffers orgId={org.id} navigation={navigation} />;
      case 'sales':
        return <DealerSales orgId={org.id} navigation={navigation} />;
      case 'mine':
        return <DealerListings orgId={org.id} />;
      default:
        return <DealerStock />;
    }
  };

  return (
    <ScreenContainer
      header={<Header onBack={navigation.goBack} title={t('business.dealer.title')} />}
      footer={
        tab === 'mine' ? (
          <>
            {marketplace ? null : <AppText variant="caption">{t('business.dealer.sellNote')}</AppText>}
            <Button
              title={t('business.dealer.listVehicle')}
              onPress={() =>
                marketplace
                  ? navigation.navigate(BUSINESS_ROUTES.DEALER_CREATE, { org })
                  : navigation.navigate(ROUTES.LIST_VEHICLE_START)
              }
            />
          </>
        ) : null
      }
    >
      <AppText variant="subtitle" style={styles.intro}>
        {t('business.dealer.intro')}
      </AppText>
      <OrgSummary org={org} style={styles.org} />
      <ChipTabs
        tabs={TABS.map(id => ({ id, label: t(`business.dealer.tab.${id}`) }))}
        value={tab}
        onChange={show}
        style={styles.tabs}
      />
      {TABS.filter(id => opened.includes(id)).map(id => (
        <View key={id} style={[styles.panel, id !== tab && styles.hidden]}>
          {body(id)}
        </View>
      ))}
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
  panel: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});

export default DealerPortal;
