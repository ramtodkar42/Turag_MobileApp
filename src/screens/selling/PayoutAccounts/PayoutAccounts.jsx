import { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Button,
  CardListSkeleton,
  FadeIn,
  Header,
  OptionSheet,
  ScreenContainer,
  StatusView,
} from '../../../components';
import { spacing } from '../../../theme';
import { ERROR_CODES } from '../../../api/client';
import { useT } from '../../../i18n';
import usePayoutAccounts from './usePayoutAccounts';
import useAddAccountForm from './useAddAccountForm';
import { proofSources } from './proofFile';
import AccountCard from './components/AccountCard';
import AddAccountForm from './components/AddAccountForm';

// Payout accounts (as the web's /sell/payouts, ADR-0037): where the money from
// the seller's sales is sent. The seller adds a bank account with a proof
// (passbook / cancelled cheque), Turag's team verifies it, and a verified one
// can be made active. Changing account is the same flow; a payout already in
// progress keeps the account it started with. Only the last four digits of a
// number are ever shown. No route params.
function PayoutAccounts({ navigation }) {
  const t = useT();
  const {
    data,
    loading,
    refreshing,
    error,
    errorCode,
    refresh,
    reload,
    busy,
    errors,
    notices,
    markChecked,
    uploadProof,
    activate,
    viewProof,
  } = usePayoutAccounts();
  const form = useAddAccountForm(account => {
    markChecked(account);
    return reload();
  });
  // Who the proof sheet is for: an account (its card's "Upload proof") or 'form'.
  const [sourceFor, setSourceFor] = useState(null);

  const header = <Header onBack={navigation.goBack} title={t('payouts.accounts.title')} />;

  if (loading) {
    return (
      <ScreenContainer header={header}>
        <CardListSkeleton cards={[3, 2, 5]} style={styles.skeleton} />
      </ScreenContainer>
    );
  }
  if (error) {
    const signedOut = errorCode === ERROR_CODES.AUTH_REQUIRED;
    return (
      <ScreenContainer header={header}>
        <StatusView
          title={t(signedOut ? 'payouts.accounts.signedOut.title' : 'payouts.accounts.error.title')}
          message={signedOut ? t('payouts.accounts.signedOut.message') : error}
        >
          <Button title={t('common.retry')} size="md" onPress={reload} style={styles.action} />
        </StatusView>
      </ScreenContainer>
    );
  }

  const accounts = data ?? [];
  const active = accounts.some(a => a.status === 'ACTIVE');

  return (
    <ScreenContainer
      header={header}
      scroll
      refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <FadeIn offset={0}>
        <AppText variant="subtitle" style={styles.intro}>
          {`${t('payouts.accounts.intro')} ${t(active ? 'payouts.accounts.introActive' : 'payouts.accounts.introNone')}`}
        </AppText>

        {accounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            busy={busy[account.id]}
            error={errors[account.id]}
            notice={notices[account.id]}
            onUpload={setSourceFor}
            onActivate={activate}
            onViewProof={viewProof}
          />
        ))}

        <AddAccountForm form={form} onChooseFile={() => setSourceFor('form')} />
      </FadeIn>

      <OptionSheet
        visible={!!sourceFor}
        title={t('payouts.proof.sheetTitle')}
        options={proofSources(t)}
        onSelect={source => (sourceFor === 'form' ? form.chooseFile(source) : uploadProof(sourceFor, source))}
        onClose={() => setSourceFor(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    marginTop: spacing.md,
  },
  intro: {
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default PayoutAccounts;
