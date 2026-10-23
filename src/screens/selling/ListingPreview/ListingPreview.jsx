import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Badge,
  Button,
  Card,
  CardListSkeleton,
  Header,
  Icon,
  InfoNote,
  KeyValueCard,
  ScreenContainer,
  TitledCard,
} from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { getInspectionReport } from '../../../api/services/report.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';

const VERIFICATION_KEYS = new Set(['TURAG_VERIFIED', 'VERIFIED_NOT_TURAG', 'SELF_DECLARED_UNVERIFIED', 'NOT_VERIFIED']);

// The seller's listing as buyers will see it (as the web's "Preview as a
// buyer"): the vehicle, where it is, the asking price and how far it's
// verified, the note "from the seller", and the inspection report (a summary
// here, the full report one tap away). Without an inspection the listing shows
// as self-declared and unverified - said so plainly.
// params: { listing } (My listing's listing: mapMyListing)
function ListingPreview({ navigation, route }) {
  const t = useT();
  const { listing } = route.params;
  const { vehicle, inspectionId } = listing;
  const [report, setReport] = useState(undefined); // undefined = loading, null = not available

  useEffect(() => {
    if (!inspectionId) {
      setReport(null);
      return undefined;
    }
    let active = true;
    getInspectionReport(inspectionId)
      .then(r => active && setReport(r))
      .catch(() => active && setReport(null));
    return () => {
      active = false;
    };
  }, [inspectionId]);

  const name = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ');
  const where = listing.location
    ? [listing.location.locality, listing.location.city, listing.location.state].filter(Boolean).join(', ')
    : '';
  const label = VERIFICATION_KEYS.has(listing.verificationLabel) ? listing.verificationLabel : 'NOT_VERIFIED';

  let reportBody;
  if (!inspectionId) {
    reportBody = <InfoNote style={styles.inner}>{t('selling.preview.noReport')}</InfoNote>;
  } else if (report === undefined) {
    reportBody = <CardListSkeleton cards={[3]} style={styles.inner} />;
  } else if (!report) {
    reportBody = <InfoNote style={styles.inner}>{t('selling.preview.reportPending')}</InfoNote>;
  } else {
    reportBody = (
      <View style={styles.inner}>
        <KeyValueCard
          dense
          rows={[
            { label: t('marketplace.report.grade'), value: report.gradeNotReady ? '—' : report.grade ?? '—' },
            {
              label: t('marketplace.report.score'),
              value: report.score != null ? `${report.score}/100` : '—', // as the report screen
            },
            { label: t('account.report.issues'), value: report.issues },
          ]}
        />
        <Button
          title={t('selling.preview.fullReport')}
          variant="outline"
          size="md"
          onPress={() => navigation.navigate(ROUTES.INSPECTION_REPORT, { inspectionId })}
          style={styles.inner}
        />
      </View>
    );
  }

  return (
    <ScreenContainer scroll header={<Header onBack={navigation.goBack} title={t('selling.preview.title')} />}>
      <AppText variant="subtitle" style={styles.intro}>
        {t('selling.preview.intro')}
      </AppText>

      {/* The listing card, as buyers see it. */}
      <Card style={styles.card}>
        <View style={styles.top}>
          <AppText variant="h3" style={styles.name}>
            {name}
          </AppText>
          <Badge
            label={t(`marketplace.inspection.${label}`)}
            tone={label === 'TURAG_VERIFIED' ? 'verified' : label === 'VERIFIED_NOT_TURAG' ? 'success' : 'warning'}
            size="sm"
          />
        </View>
        {vehicle.variant ? <AppText variant="caption">{vehicle.variant}</AppText> : null}
        {where ? (
          <View style={styles.where}>
            <Icon name="mapPin" size={ms(13)} color={colors.body} />
            <AppText variant="caption" style={styles.flex}>
              {where}
            </AppText>
          </View>
        ) : null}
        <AppText variant="h2" color={colors.success} style={styles.price}>
          {listing.askPrice != null ? formatINR(listing.askPrice) : '—'}
        </AppText>
      </Card>

      {listing.sellerNote ? (
        <TitledCard title={t('selling.preview.fromSeller')} style={styles.card}>
          <AppText variant="subtitle" style={styles.inner}>
            {listing.sellerNote}
          </AppText>
        </TitledCard>
      ) : null}

      <TitledCard title={t('selling.preview.report')} style={styles.card}>
        {reportBody}
      </TitledCard>
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
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: fs(20),
    lineHeight: fs(26),
  },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  price: {
    marginTop: spacing.md,
  },
  inner: {
    marginTop: spacing.md,
  },
});

export default ListingPreview;
