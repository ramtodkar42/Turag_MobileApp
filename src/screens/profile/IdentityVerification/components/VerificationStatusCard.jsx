import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Card } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { formatDate } from '../../../../utils/format';
import { useT } from '../../../../i18n';

// Each status: its badge (text + tone) and the line under it (as the web).
export const STATUS = {
  INITIATED: { key: 'verify.status.INITIATED', tone: 'warning', noteKey: 'verify.status.initiatedNote' },
  PENDING_REVIEW: { key: 'verify.status.PENDING_REVIEW', tone: 'warning', noteKey: 'verify.status.pendingNote' },
  APPROVED: { key: 'verify.status.APPROVED', tone: 'success', noteKey: 'verify.status.approvedNote' },
  REJECTED: { key: 'verify.status.REJECTED', tone: 'danger', noteKey: 'verify.status.rejectedNote' },
  FAILED: { key: 'verify.status.FAILED', tone: 'danger', noteKey: 'verify.status.failedNote' },
  EXPIRED: { key: 'verify.status.EXPIRED', tone: 'neutral', noteKey: 'verify.status.expiredNote' },
};

// The user's verification: the document (masked), "via DigiLocker", the status
// badge, when it was sent, what it means and - when rejected - why.
// onAgain: shows "Verify again" (rejected manual one); omit to hide it.
function VerificationStatusCard({ verification, onAgain, style }) {
  const t = useT();
  const status = STATUS[verification.status];
  const viaDigiLocker = verification.method === 'DIGILOCKER';

  return (
    <Card style={style}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="title">
            {verification.docType ? t(`verify.doc.${verification.docType}`) : t('verify.doc.AADHAAR')}
          </AppText>
          {verification.docMasked ? (
            <AppText variant="caption" style={styles.masked}>
              {verification.docMasked}
            </AppText>
          ) : null}
          {viaDigiLocker ? (
            <AppText variant="caption" color={colors.primary} style={styles.via}>
              {t('verify.dl.via')}
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
          {t(viaDigiLocker && verification.status === 'APPROVED' ? 'verify.dl.approvedNote' : status.noteKey)}
        </AppText>
      ) : null}
      {verification.status === 'REJECTED' && verification.rejectionReason ? (
        <AppText variant="caption" color={colors.danger} style={styles.note}>
          {t('verify.status.reason', { reason: verification.rejectionReason })}
        </AppText>
      ) : null}
      {onAgain ? <Button title={t('verify.status.again')} onPress={onAgain} style={styles.action} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
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
  via: {
    marginTop: spacing.xxs,
  },
  note: {
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default VerificationStatusCard;
