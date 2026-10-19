import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Icon } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { formatSlot } from '../../../../utils/date';
import { useT } from '../../../../i18n';
import { BOOKING_STATUS } from '../../statuses';

// One booking in My inspections (as the web's list): vehicle type, time and
// place, status, and View report (once there is one) / View receipt (fee
// paid) / Cancel (while allowed).
// Tapping the card opens the booking.
function BookingRow({ booking, busy, onOpen, onReport, onReceipt, onCancel }) {
  const t = useT();
  const status = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.REQUESTED;
  const kind = t(`account.booking.kind.${booking.category === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'PASSENGER'}`);

  return (
    <Pressable
      onPress={() => onOpen(booking)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <AppText variant="title" style={styles.title} numberOfLines={1}>
          {t('account.booking.heading', { kind })}
        </AppText>
        <Badge label={t(status.labelKey)} tone={status.tone} size="sm" />
      </View>
      <AppText variant="caption" style={styles.meta}>
        {[booking.slotAt ? formatSlot(booking.slotAt) : null, [booking.city, booking.pincode].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join(' · ')}
      </AppText>

      <View style={styles.actions}>
        {booking.inspectionId ? (
          <Button title={t('account.booking.report.view')} size="sm" onPress={() => onReport(booking)} />
        ) : null}
        {booking.feePaid ? (
          <Button
            title={t('account.receipt.view')}
            size="sm"
            variant="outline"
            onPress={() => onReceipt(booking)}
          />
        ) : null}
        {booking.canCancel ? (
          <Button
            title={t('account.list.cancel')}
            size="sm"
            variant="outline"
            onPress={() => onCancel(booking)}
            disabled={busy}
          />
        ) : null}
        <View style={styles.open}>
          <AppText variant="label" color={colors.primary}>
            {t(booking.chatOpen ? 'account.list.viewChat' : 'account.list.view')}
          </AppText>
          <Icon name="chevronRight" size={ms(14)} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  pressed: {
    opacity: 0.85,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  meta: {
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  open: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginLeft: 'auto',
  },
});

export default memo(BookingRow);
