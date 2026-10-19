import { Platform, StyleSheet, View } from 'react-native';
import { AppText, CheckCircle, Icon } from '../../../components';
import { colors, radius, shadows, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const BADGE = ms(26);

// One line of the receipt: a round tinted icon, a small title, the value
// (shown in full - e.g. a long address wraps).
function ReceiptRow({ icon, title, value, mono = false, accent = false, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.badge, accent && styles.badgeAccent]}>
        {accent ? <CheckCircle size={BADGE * 0.55} color={colors.primary} /> : icon}
      </View>
      <View style={styles.rowText}>
        <AppText variant="caption" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="label" color={colors.heading} style={[styles.value, mono && styles.mono]} selectable={mono}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

// Two short lines side by side (e.g. Vehicle | Type), so the whole receipt
// fits in one view. Each keeps at least ~half the width; on very narrow
// screens they wrap under each other.
function Pair({ children }) {
  return <View style={styles.pair}>{children}</View>;
}

// The booking receipt (as the web's): reference, vehicle, when, where, type,
// payment reference, paid on, and the fee band. receipt: buildReceipt().
// status (optional): the booking's status label, next to "Paid on".
function ReceiptCard({ receipt, status, style }) {
  const t = useT();
  const icon = name => <Icon name={name} size={ms(16)} color={colors.primary} />;
  return (
    <View style={[styles.card, style]}>
      <View style={styles.head}>
        <AppText variant="caption" style={styles.docLabel}>
          {t('account.receipt.docLabel')}
        </AppText>
        <AppText variant="label" color={colors.heading} style={[styles.mono, styles.ref]} selectable>
          {receipt.bookingRef}
        </AppText>
      </View>

      <View style={styles.body}>
        <Pair>
          <ReceiptRow icon={icon('car')} title={t('account.receipt.vehicle')} value={receipt.vehicle} style={styles.half} />
          <ReceiptRow icon={icon('user')} title={t('account.receipt.type')} value={receipt.type} style={styles.half} />
        </Pair>
        <ReceiptRow icon={icon('calendar')} title={t('account.receipt.datetime')} value={receipt.when} />
        <ReceiptRow icon={icon('navigation')} title={t('account.receipt.location')} value={receipt.where} />
        {receipt.reference ? (
          <ReceiptRow
            icon={
              <AppText variant="title" color={colors.primary} style={styles.hash}>
                #
              </AppText>
            }
            title={t('account.receipt.reference')}
            value={receipt.reference}
            mono
          />
        ) : null}
        {status ? (
          <Pair>
            <ReceiptRow title={t('account.receipt.date')} value={receipt.paidOn} accent style={styles.half} />
            <ReceiptRow icon={icon('shieldCheck')} title={t('booking.confirmed.status')} value={status} style={styles.half} />
          </Pair>
        ) : (
          <ReceiptRow title={t('account.receipt.date')} value={receipt.paidOn} accent />
        )}
      </View>

      <View style={styles.fee}>
        <View style={styles.feeRow}>
          <AppText variant="title" style={styles.feeLabel}>
            {t('account.receipt.fee')}
          </AppText>
          <AppText variant="h2" style={styles.amount}>
            {receipt.amount}
          </AppText>
        </View>
        <View style={styles.noteRow}>
          <View style={styles.line} />
          <AppText variant="caption" style={styles.note}>
            {t('account.receipt.paidNote')}
          </AppText>
          <View style={styles.line} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  head: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
  },
  docLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: fs(9.5),
  },
  ref: {
    marginTop: spacing.xs,
    fontSize: fs(12.5),
    lineHeight: fs(17),
  },
  mono: {
    fontFamily: MONO,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  pair: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.sm,
    columnGap: spacing.md,
  },
  half: {
    flexGrow: 1,
    flexBasis: ms(130),
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  badgeAccent: {
    backgroundColor: colors.primary,
  },
  hash: {
    fontSize: fs(15),
    lineHeight: fs(18),
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  value: {
    fontSize: fs(12.5),
    lineHeight: fs(17),
    flexShrink: 1,
  },
  fee: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.unreadTint,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  feeLabel: {
    fontSize: fs(14),
    lineHeight: fs(18),
  },
  amount: {
    fontSize: fs(20),
    lineHeight: fs(24),
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  note: {
    fontSize: fs(10),
  },
});

export default ReceiptCard;
