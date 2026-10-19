import { ImageBackground, StyleSheet, View } from 'react-native';
import { AppText, Badge, Icon, IconTile } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import CopyButton from '../../../chat/Chat/components/CopyButton';

const BANNER = require('../../../../assets/images/booking/inspection-banner.png');

// Top of a booking: the pink banner (car + inspector on the right), the kind
// of inspection, its status and the Booking ID (copyable).
// status: { label, tone } (from BOOKING_STATUS).
function BookingHero({ title, bookingId, status, style }) {
  const t = useT();
  const success = status.tone === 'success';
  return (
    <ImageBackground
      source={BANNER}
      resizeMode="cover"
      style={[styles.card, style]}
      imageStyle={styles.image}
    >
      <View style={styles.badge}>
        <Badge
          label={status.label}
          tone={success ? 'verified' : status.tone}
          size="sm"
          icon={success ? <Icon name="check" size={ms(10)} color={colors.white} strokeWidth={3} /> : null}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <IconTile name="car" size={ms(38)} backgroundColor={colors.white} />
          <AppText variant="h3" style={styles.title}>
            {title}
          </AppText>
        </View>

        <AppText variant="caption" style={styles.label}>
          {t('account.booking.idLabel')}
        </AppText>
        <View style={styles.idRow}>
          <AppText variant="caption" color={colors.heading} style={styles.id} selectable numberOfLines={2}>
            {bookingId}
          </AppText>
          <CopyButton text={bookingId} />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: ms(132),
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.unreadTint,
    ...shadows.md,
  },
  image: {
    borderRadius: radius.xl,
  },
  badge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  // The left part, clear of the car and the inspector.
  content: {
    width: '60%',
    marginTop: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fs(16),
    lineHeight: fs(21),
  },
  label: {
    marginTop: spacing.md,
    fontSize: fs(11),
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  id: {
    flexShrink: 1,
    fontSize: fs(10.5),
    letterSpacing: 0.3,
  },
});

export default BookingHero;
