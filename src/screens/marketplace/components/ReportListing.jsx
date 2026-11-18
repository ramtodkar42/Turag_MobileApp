import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon, OptionSheet } from '../../../components';
import { colors, spacing } from '../../../theme';
import { HIT_SLOP } from '../../../constants/layout';
import { ms } from '../../../utils/responsive';
import { BACKEND_URL } from '../../../api/config';
import { tNow, useT } from '../../../i18n';

export const SUPPORT_EMAIL = 'support@turag.ai';

// Why a listing is being reported (the person picks one).
export const REPORT_REASONS = ['fake', 'details', 'sold', 'content', 'scam', 'other'];

// The report as an email to Turag support: the reason, which listing (name, id and
// its page on turag.ai) and room for the person's own words.
export const reportEmailUrl = (vehicle, reason) => {
  const subject = tNow('marketplace.reportListing.subject', { id: vehicle.id });
  const body = [
    tNow('marketplace.reportListing.bodyReason', { reason: tNow(`marketplace.reportListing.reason.${reason}`) }),
    tNow('marketplace.reportListing.bodyListing', { name: vehicle.name ?? '', id: vehicle.id }),
    `${BACKEND_URL}/used-cars-marketplace/${vehicle.id}`,
    '',
    tNow('marketplace.reportListing.bodyMore'),
    '',
  ].join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

// "Report this listing", quietly at the end of a vehicle page (Google Play's rule for
// what people post: anyone can report it from the app). Pick a reason; the email app
// opens with the report to Turag support written out. No email app: the address to
// write to instead.
function ReportListing({ vehicle, style }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(null); // 'sent' | 'noMail'

  const report = async reason => {
    try {
      await Linking.openURL(reportEmailUrl(vehicle, reason));
      setNote('sent');
    } catch {
      setNote('noMail');
    }
  };

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      >
        <Icon name="flag" size={ms(14)} color={colors.placeholder} />
        <AppText variant="caption" color={colors.placeholder}>
          {t('marketplace.reportListing.action')}
        </AppText>
      </Pressable>
      {note ? (
        <AppText variant="caption" align="center" selectable>
          {note === 'sent'
            ? t('marketplace.reportListing.sent')
            : t('marketplace.reportListing.noMail', { email: SUPPORT_EMAIL })}
        </AppText>
      ) : null}

      <OptionSheet
        visible={open}
        title={t('marketplace.reportListing.title')}
        options={REPORT_REASONS.map(reason => ({ value: reason, label: t(`marketplace.reportListing.reason.${reason}`) }))}
        onSelect={report}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default ReportListing;
