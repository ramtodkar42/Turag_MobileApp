import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Button,
  CardListSkeleton,
  FadeIn,
  Header,
  ScreenContainer,
  StatusView,
} from '../../../components';
import { spacing } from '../../../theme';
import { getVerificationStatus, isEnded, showManual } from '../../../api/services/verification.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import VerificationStatusCard from './components/VerificationStatusCard';
import VerifyOptionCard from './components/VerifyOptionCard';

// Profile > Identity verification (as the web's Account > Verification): the
// status of the user's ID check and the ways to do one - whichever the server
// offers: DigiLocker (share Aadhaar, approved at once) and / or a document +
// selfie reviewed by Turag's team (where DigiLocker is the main way, the upload
// is offered once a DigiLocker try didn't complete). Optional - it never holds
// up a booking. Reloads each time it comes back into view.
function IdentityVerification({ navigation }) {
  const t = useT();
  const [data, setData] = useState(undefined); // undefined = loading
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let active = true;
    setError('');
    getVerificationStatus()
      .then(d => active && setData(d))
      .catch(e => active && setError(e?.message || t('verify.status.loadError')));
    return () => {
      active = false;
    };
  }, [t]);
  useFocusEffect(load);

  const verifyManually = () => navigation.navigate(ROUTES.VERIFY_IDENTITY);
  const verifyDigiLocker = () => navigation.navigate(ROUTES.DIGILOCKER);

  let body;
  if (error && data === undefined) {
    body = (
      <StatusView title={t('verify.status.title')} message={error} style={styles.status}>
        <Button title={t('common.retry')} size="md" variant="outline" onPress={load} style={styles.retry} />
      </StatusView>
    );
  } else if (data === undefined) {
    body = <CardListSkeleton cards={[3, 3]} style={styles.card} />;
  } else {
    const { verification, options } = data;
    const status = verification?.status;
    // Done or with the team: nothing more to do. Otherwise offer the ways in.
    const settled = status === 'APPROVED' || status === 'PENDING_REVIEW';
    const canRetry = !verification || status === 'REJECTED' || status === 'INITIATED' || isEnded(verification);
    const offerDigiLocker = options.digilocker && canRetry && !settled;
    const offerManual = showManual(verification, options) && canRetry && !settled;

    body = (
      <FadeIn offset={0}>
        {verification ? <VerificationStatusCard verification={verification} style={styles.card} /> : null}
        {offerDigiLocker ? (
          <VerifyOptionCard
            icon="shieldCheck"
            titleKey="verify.dl.title"
            noteKey="verify.dl.note"
            badgeKey="verify.dl.instant"
            consentKey="verify.dl.consent"
            buttonKey={status === 'INITIATED' || isEnded(verification) ? 'verify.dl.again' : 'verify.dl.button'}
            onPress={verifyDigiLocker}
            style={styles.card}
          />
        ) : null}
        {offerManual ? (
          <VerifyOptionCard
            icon="document"
            titleKey={offerDigiLocker ? 'verify.manual.insteadTitle' : 'verify.status.noneTitle'}
            noteKey="verify.status.noneNote"
            buttonKey={status === 'REJECTED' ? 'verify.status.again' : 'verify.title'}
            variant={offerDigiLocker ? 'outline' : 'primary'}
            onPress={verifyManually}
            style={styles.card}
          />
        ) : null}
      </FadeIn>
    );
  }

  return (
    <ScreenContainer scroll header={<Header onBack={navigation.goBack} title={t('verify.status.title')} />}>
      <AppText variant="subtitle" style={styles.intro}>
        {t('verify.status.intro')}
      </AppText>
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: spacing.md,
  },
  card: {
    marginTop: spacing.lg,
  },
  retry: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  status: {
    marginTop: spacing.xxl,
  },
});

export default IdentityVerification;
