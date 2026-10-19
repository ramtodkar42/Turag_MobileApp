import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Card } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatINR } from '../../../../utils/format';
import { formatDateTime, formatSlot } from '../../../../utils/date';
import { useLanguage, useT } from '../../../../i18n';
import DetailRow from './DetailRow';

// "Inspection details": date & time ("Today, 18:00" + the full date), the
// address, the fee with Paid / Payment pending, and View receipt once paid.
function InspectionDetailsCard({ booking, place, onViewReceipt, style }) {
  const t = useT();
  const language = useLanguage();

  return (
    <Card style={style}>
      <AppText variant="title" style={styles.title}>
        {t('account.booking.detailsTitle')}
      </AppText>

      <DetailRow icon="calendar" label={t('account.booking.dateTime')}>
        {booking.slotAt ? (
          <>
            <AppText variant="title" align="right" style={styles.strong}>
              {formatSlot(booking.slotAt)}
            </AppText>
            <AppText variant="caption" align="right" style={styles.small}>
              {formatDateTime(booking.slotAt, language)}
            </AppText>
          </>
        ) : (
          <AppText variant="subtitle">—</AppText>
        )}
      </DetailRow>

      <DetailRow icon="navigation" label={t('account.booking.address')}>
        <AppText variant="caption" color={colors.heading} align="right" style={styles.small}>
          {place || '—'}
        </AppText>
      </DetailRow>

      <DetailRow icon="rupee" label={t('account.booking.fee')} last>
        <View style={styles.fee}>
          <AppText variant="title" style={styles.strong}>
            {booking.price != null ? formatINR(booking.price) : '—'}
          </AppText>
          {booking.price != null ? (
            <Badge
              label={t(booking.feePaid ? 'account.booking.paid' : 'account.booking.unpaid')}
              tone={booking.feePaid ? 'success' : 'warning'}
              size="sm"
            />
          ) : null}
        </View>
      </DetailRow>

      {booking.feePaid ? (
        <Button
          title={t('account.receipt.view')}
          size="md"
          variant="outline"
          fullWidth
          onPress={onViewReceipt}
          style={styles.receipt}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  strong: {
    fontSize: fs(14),
    lineHeight: fs(19),
  },
  small: {
    fontSize: fs(11),
    lineHeight: fs(16),
  },
  fee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  receipt: {
    marginTop: spacing.sm,
  },
});

export default InspectionDetailsCard;
