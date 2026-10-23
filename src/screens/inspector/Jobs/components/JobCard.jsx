import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, Icon, IconText } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { formatSlot } from '../../../../utils/date';
import { useT } from '../../../../i18n';
import { BOOKING_STATUS } from '../../../account/statuses';

// One job (as the web's job board card): time, status, vehicle type,
// address and pincode. Tapping opens the job. expired: the slot passed before
// it was started - reads "Expired", no Open (ops must reschedule); it can
// still be opened to read it and chat.
function JobCard({ job, expired = false, onPress }) {
  const t = useT();
  const status = BOOKING_STATUS[job.status] ?? BOOKING_STATUS.REQUESTED;
  const kind = t(`account.booking.kind.${job.category === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'PASSENGER'}`);

  let action = null;
  if (expired) {
    action = (
      <AppText variant="caption" color={colors.body} numberOfLines={2} style={styles.expiredNote}>
        {t('inspector.jobs.expiredHint')}
      </AppText>
    );
  } else if (job.toDo) {
    action = (
      <View style={styles.open}>
        <AppText variant="label" color={colors.primary}>
          {t(job.inspectionId ? 'inspector.jobs.continue' : 'inspector.jobs.open')}
        </AppText>
        <Icon name="chevronRight" size={ms(14)} color={colors.primary} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(job)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, (!job.toDo || expired) && styles.past, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <AppText variant="h3" style={styles.time}>
          {job.slotAt ? formatSlot(job.slotAt) : '—'}
        </AppText>
        <Badge
          label={expired ? t('inspector.jobs.expiredBadge') : t(status.labelKey)}
          tone={expired ? 'neutral' : status.tone}
          size="sm"
        />
      </View>
      <AppText variant="label" color={colors.heading} style={styles.kind}>
        {t('account.booking.heading', { kind })}
      </AppText>
      <IconText
        icon="navigation"
        text={[job.address, [job.city, job.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
        style={styles.address}
      />
      <View style={styles.bottom}>
        <AppText variant="caption" numberOfLines={1} style={styles.flex}>
          {job.id}
        </AppText>
        {action}
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
  past: {
    opacity: 0.75,
  },
  pressed: {
    opacity: 0.85,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: {
    flex: 1,
    fontSize: fs(17),
    lineHeight: fs(23),
  },
  kind: {
    marginTop: spacing.xs,
  },
  address: {
    marginTop: spacing.xs,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  flex: {
    flex: 1,
  },
  expiredNote: {
    flexShrink: 1,
    textAlign: 'right',
  },
  open: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
});

export default memo(JobCard);
