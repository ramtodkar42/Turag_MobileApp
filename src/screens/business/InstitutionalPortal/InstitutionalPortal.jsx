import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ChipTabs, Header, ScreenContainer } from '../../../components';
import { spacing } from '../../../theme';
import { useT } from '../../../i18n';
import OrgSummary from '../components/OrgSummary';
import { BUSINESS_ROUTES } from '../routes';
import ImportsTab from './components/ImportsTab';
import IntakeTab from './components/IntakeTab';
import PortfolioTab from './components/PortfolioTab';
import YardTab from './components/YardTab';

// Bulk intake import is a lender / yard capability (as the web).
const CAN_IMPORT = new Set(['LENDER', 'YARD']);

// Institutional portal (as the web's /institutional + /institutional/import):
// a read-only view of the org's portfolio, intake and yard - registration and
// movements are done by Turag ops - plus bulk CSV intake imports for lender /
// yard orgs. Each tab loads the first time it is opened.
// params: { org } (from Business home)
function InstitutionalPortal({ navigation, route }) {
  const t = useT();
  const { org } = route.params;
  const [tab, setTab] = useState('portfolio');
  const canImport = CAN_IMPORT.has(org.type);

  const tabs = [
    { id: 'portfolio', label: t('business.inst.tab.portfolio') },
    { id: 'intake', label: t('business.inst.tab.intake') },
    { id: 'yard', label: t('business.inst.tab.yard') },
    ...(canImport ? [{ id: 'imports', label: t('business.inst.tab.imports') }] : []),
  ];

  const openIntake = useCallback(
    item => navigation.navigate(BUSINESS_ROUTES.INTAKE_DETAIL, { orgId: org.id, intakeId: item.id }),
    [navigation, org.id],
  );
  const openPlacement = useCallback(
    item => navigation.navigate(BUSINESS_ROUTES.PLACEMENT_DETAIL, { orgId: org.id, placementId: item.id }),
    [navigation, org.id],
  );
  const openImport = useCallback(
    item => navigation.navigate(BUSINESS_ROUTES.IMPORT_JOB, { orgId: org.id, importId: item.id, job: item }),
    [navigation, org.id],
  );

  const top = (
    <View>
      <AppText variant="subtitle" style={styles.intro}>
        {t('business.inst.intro')}
      </AppText>
      <OrgSummary org={org} style={styles.org} />
      <ChipTabs tabs={tabs} value={tab} onChange={setTab} style={styles.tabs} />
    </View>
  );

  let body;
  if (tab === 'intake') {
    body = <IntakeTab orgId={org.id} top={top} onOpen={openIntake} />;
  } else if (tab === 'yard') {
    body = <YardTab orgId={org.id} top={top} onOpen={openPlacement} />;
  } else if (tab === 'imports') {
    body = <ImportsTab orgId={org.id} top={top} onOpen={openImport} />;
  } else {
    body = <PortfolioTab orgId={org.id} top={top} />;
  }

  return (
    <ScreenContainer
      header={<Header onBack={navigation.goBack} title={t('business.inst.title')} />}
      footer={
        tab === 'imports' ? (
          <Button
            title={t('business.import.new')}
            onPress={() => navigation.navigate(BUSINESS_ROUTES.BULK_IMPORT, { org })}
          />
        ) : null
      }
    >
      {body}
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

export default InstitutionalPortal;
