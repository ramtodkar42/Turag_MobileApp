import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import CheckNotice from './CheckNotice';

// The web's status tones: positive -> success, warning, neutral.
const STATUS_TONE = {
  DRAFT: 'warning',
  PENDING_VERIFICATION: 'warning',
  VERIFIED: 'success',
  REJECTED: 'neutral',
  ACTIVE: 'success',
  INACTIVE: 'neutral',
};

// One payout account (as the web's AccountCard): bank, masked number and IFSC,
// holder, status, a note for its state, and its actions:
//   DRAFT:              Upload proof
//   VERIFIED/INACTIVE:  Use for payouts
//   proof attached:     View proof
// busy: 'upload' | 'activate' | 'proof' while an action runs; error: its message;
// notice: right after the proof upload, 'instant' (passed the automatic bank
// check) or 'review' (with Turag's team).
function AccountCard({ account, busy, error, notice, onUpload, onActivate, onViewProof }) {
  const t = useT();
  const canActivate = account.status === 'VERIFIED' || account.status === 'INACTIVE';
  const working = !!busy;

  let note = null;
  if (account.status === 'REJECTED' && account.rejectionReason) {
    note = (
      <AppText variant="caption" color={colors.danger}>
        {t('payouts.account.rejected', { reason: account.rejectionReason })}
      </AppText>
    );
  } else if (account.status === 'PENDING_VERIFICATION') {
    note = <AppText variant="caption">{t('payouts.account.pendingNote')}</AppText>;
  } else if (account.status === 'ACTIVE') {
    note = <AppText variant="caption">{t('payouts.account.activeNote')}</AppText>;
  }

  const hasActions = account.status === 'DRAFT' || canActivate || !!account.proof;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="title" style={styles.bank} numberOfLines={2}>
            {account.bankName}
          </AppText>
          <AppText variant="caption" color={colors.body} style={styles.line}>
            {`${account.numberMasked} · ${account.ifsc}`}
          </AppText>
          <AppText variant="caption" style={styles.line}>
            {account.holderName}
          </AppText>
        </View>
        <Badge label={t(`payouts.status.${account.status}`)} tone={STATUS_TONE[account.status] ?? 'neutral'} size="sm" />
      </View>

      {notice ? <CheckNotice kind={notice} style={styles.note} /> : null}
      {note ? <View style={styles.note}>{note}</View> : null}

      {hasActions ? (
        <View style={styles.actions}>
          {account.status === 'DRAFT' ? (
            <Button
              title={t(busy === 'upload' ? 'payouts.account.uploading' : 'payouts.account.uploadProof')}
              size="sm"
              fullWidth={false}
              disabled={working}
              onPress={() => onUpload(account)}
            />
          ) : null}
          {canActivate ? (
            <Button
              title={t(busy === 'activate' ? 'payouts.account.switching' : 'payouts.account.activate')}
              size="sm"
              fullWidth={false}
              disabled={working}
              onPress={() => onActivate(account)}
            />
          ) : null}
          {account.proof ? (
            <Button
              title={t('payouts.account.viewProof')}
              size="sm"
              variant="outline"
              fullWidth={false}
              loading={busy === 'proof'}
              disabled={working && busy !== 'proof'}
              onPress={() => onViewProof(account)}
            />
          ) : null}
        </View>
      ) : null}

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.note} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  bank: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  line: {
    marginTop: spacing.xxs,
  },
  note: {
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});

export default memo(AccountCard);
