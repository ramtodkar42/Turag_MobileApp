import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatDate } from '../../../../utils/format';
import { toIsoDate } from '../../../../utils/date';
import { HIT_SLOP } from '../../../../constants/layout';
import { useT } from '../../../../i18n';
import { formatMinor } from '../useSettlements';

// The web's pill colours: PAID green, PENDING / AWAITING_ACCOUNT amber,
// AWAITING_CONFIG grey, FAILED red.
const STATUS_TONE = {
  PAID: 'success',
  PENDING: 'warning',
  AWAITING_ACCOUNT: 'warning',
  AWAITING_CONFIG: 'neutral',
  FAILED: 'danger',
};

const dateLabel = time => (time ? formatDate(toIsoDate(new Date(time))) : '—');

// A label on the left, its value (or element) on the right.
function Line({ label, children }) {
  return (
    <View style={styles.line}>
      <AppText variant="caption" style={styles.lineLabel}>
        {label}
      </AppText>
      <View style={styles.lineValue}>{children}</View>
    </View>
  );
}

// A small red text button (the web's links in the ledger).
function LinkText({ title, onPress, loading }) {
  return (
    <Pressable onPress={onPress} disabled={loading} hitSlop={HIT_SLOP} accessibilityRole="link">
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <AppText variant="caption" color={colors.primary} style={styles.link}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

// One settlement ledger entry (a row of the web's table, as a card): vehicle
// (or the order id), status, what the seller receives with its breakdown
// (token - commission - GST), where it is paid (or "Add a payout account"),
// the bank reference and receipt once paid, and the date.
function SettlementCard({ settlement: s, opening, error, onAddAccount, onReceipt }) {
  const t = useT();
  const vehicle = s.vehicle ? [s.vehicle.make, s.vehicle.model, s.vehicle.year].filter(Boolean).join(' ') : null;

  let paidTo = (
    <AppText variant="caption" color={colors.heading} align="right">
      —
    </AppText>
  );
  if (s.account) {
    paidTo = (
      <AppText variant="caption" color={colors.heading} align="right">
        {`${s.account.bankName} `}
        <AppText variant="caption" color={colors.body}>
          {s.account.numberMasked}
        </AppText>
      </AppText>
    );
  } else if (s.status === 'AWAITING_ACCOUNT') {
    paidTo = <LinkText title={t('payouts.settle.addAccount')} onPress={onAddAccount} />;
  }

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <AppText variant="title" style={styles.name} numberOfLines={2} color={vehicle ? colors.heading : colors.body}>
            {vehicle ?? s.orderId}
          </AppText>
          <AppText variant="caption" style={styles.meta} numberOfLines={1}>
            {`${t('payouts.settle.settlement')} ${s.id}`}
          </AppText>
        </View>
        <Badge label={t(`payouts.settle.status.${s.status}`)} tone={STATUS_TONE[s.status] ?? 'neutral'} size="sm" />
      </View>

      <View style={styles.amountBlock}>
        <AppText variant="caption">{t('payouts.settle.amount')}</AppText>
        <AppText variant="h3" style={styles.amount}>
          {s.amountMinor != null ? formatMinor(s.amountMinor) : '—'}
        </AppText>
        {s.breakdown ? (
          <AppText variant="caption" color={colors.body} style={styles.meta}>
            {`${t('payouts.settle.breakdown.token')} ${formatMinor(s.breakdown.baseMinor)} − ${t(
              'payouts.settle.breakdown.commission',
            )} ${formatMinor(s.breakdown.commissionMinor)} − ${t('payouts.settle.breakdown.gst')} ${formatMinor(
              s.breakdown.gstMinor,
            )}`}
          </AppText>
        ) : null}
      </View>

      <View style={styles.details}>
        <Line label={t('payouts.settle.paidTo')}>{paidTo}</Line>
        {s.bankReference ? (
          <Line label={t('payouts.settle.reference')}>
            <View style={styles.reference}>
              <AppText variant="caption" color={colors.heading} align="right" style={styles.shrink}>
                {s.bankReference}
              </AppText>
              {s.hasReceipt ? (
                <>
                  <AppText variant="caption">·</AppText>
                  <LinkText title={t('payouts.settle.receipt')} loading={opening} onPress={() => onReceipt(s)} />
                </>
              ) : null}
            </View>
          </Line>
        ) : null}
        <Line label={t('payouts.settle.date')}>
          <AppText variant="caption" color={colors.body} align="right">
            {dateLabel(s.settledAt ?? s.createdAt)}
          </AppText>
        </Line>
      </View>

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.meta} accessibilityLiveRegion="polite">
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
  name: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  meta: {
    marginTop: spacing.xxs,
  },
  amountBlock: {
    marginTop: spacing.md,
  },
  amount: {
    fontSize: fs(20),
    lineHeight: fs(26),
  },
  details: {
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  lineLabel: {
    minWidth: '30%',
  },
  lineValue: {
    flex: 1,
    alignItems: 'flex-end',
  },
  reference: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  shrink: {
    flexShrink: 1,
  },
  link: {
    textDecorationLine: 'underline',
  },
});

export default memo(SettlementCard);
