import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Badge,
  Button,
  CardListSkeleton,
  Header,
  Icon,
  ScreenContainer,
  StatusView,
} from '../../../components';
import { colors, radius, shadows, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { formatDate } from '../../../utils/format';
import { getMyVerification } from '../../../api/services/verification.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';

const STATUS = {
  PENDING_REVIEW: { key: 'verify.status.PENDING_REVIEW', tone: 'warning', noteKey: 'verify.status.pendingNote' },
  APPROVED: { key: 'verify.status.APPROVED', tone: 'success', noteKey: 'verify.status.approvedNote' },
  REJECTED: { key: 'verify.status.REJECTED', tone: 'danger', noteKey: 'verify.status.rejectedNote' },
};
const ICON = ms(52);

// Profile > Identity verification (as the web's Account > Verification): the
// status of the user's ID check, and a way to send one (optional - it never
// holds up a booking or a payment). Not sent yet: "Verify your identity";
// rejected: the reason and "Verify again"; under review / verified: the status.
// Reloads each time it comes back into view (e.g. after sending one).
function IdentityVerification({ navigation }) {
  const t = useT();
  const [verification, setVerification] = useState(undefined); // undefined = loading
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let active = true;
    setError('');
    getMyVerification()
      .then(v => active && setVerification(v))
      .catch(e => active && setError(e?.message || t('verify.status.loadError')));
    return () => {
      active = false;
    };
  }, [t]);
  useFocusEffect(load);

  const verify = () => navigation.navigate(ROUTES.VERIFY_IDENTITY);
  const status = verification ? STATUS[verification.status] : null;

  let body;
  if (error && verification === undefined) {
    body = (
      <StatusView title={t('verify.status.title')} message={error} style={styles.status}>
        <Button title={t('common.retry')} size="md" variant="outline" onPress={load} style={styles.action} />
      </StatusView>
    );
  } else if (verification === undefined) {
    body = <CardListSkeleton cards={[3]} style={styles.card} />;
  } else if (!verification) {
    // Never sent one.
    body = (
      <View style={[styles.card, styles.panel, styles.center]}>
        <View style={styles.icon}>
          <Icon name="shieldCheck" size={ms(26)} color={colors.primary} />
        </View>
        <AppText variant="title" align="center" style={styles.heading}>
          {t('verify.status.noneTitle')}
        </AppText>
        <AppText variant="caption" align="center" style={styles.note}>
          {t('verify.status.noneNote')}
        </AppText>
        <Button title={t('verify.title')} onPress={verify} style={styles.action} />
      </View>
    );
  } else {
    body = (
      <View style={[styles.card, styles.panel]}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="title">{t(`verify.doc.${verification.docType}`)}</AppText>
            {verification.docMasked ? (
              <AppText variant="caption" style={styles.masked}>
                {verification.docMasked}
              </AppText>
            ) : null}
          </View>
          {status ? <Badge label={t(status.key)} tone={status.tone} size="sm" /> : null}
        </View>
        {verification.submittedAt ? (
          <AppText variant="caption" style={styles.note}>
            {t('verify.status.submitted', { date: formatDate(verification.submittedAt) })}
          </AppText>
        ) : null}
        {status ? (
          <AppText variant="caption" color={colors.body} style={styles.note}>
            {t(status.noteKey)}
          </AppText>
        ) : null}
        {verification.status === 'REJECTED' && verification.rejectionReason ? (
          <AppText variant="caption" color={colors.danger} style={styles.note}>
            {t('verify.status.reason', { reason: verification.rejectionReason })}
          </AppText>
        ) : null}
        {verification.status === 'REJECTED' ? (
          <Button title={t('verify.status.again')} onPress={verify} style={styles.action} />
        ) : null}
      </View>
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
  panel: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  center: {
    alignItems: 'center',
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  heading: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  masked: {
    marginTop: spacing.xxs,
    letterSpacing: 1,
  },
  note: {
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  status: {
    marginTop: spacing.xxl,
  },
});

export default IdentityVerification;
