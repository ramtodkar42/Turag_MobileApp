import { StyleSheet } from 'react-native';
import { AppText, Badge, KeyValueCard } from '../../../components';
import { spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatDate } from '../../../utils/format';
import { useT } from '../../../i18n';

// The public inspection report in short: score, grade, major issues,
// inspector and validity. Nothing is shown when the vehicle has no report.
// report: see mappers/listing.js (mapReport)
function InspectionSummaryCard({ report, style }) {
  const t = useT();
  if (!report) {
    return null;
  }

  const rows = [
    report.score != null ? { label: t('marketplace.report.score'), value: `${report.score}/10` } : null,
    report.grade ? { label: t('marketplace.report.grade'), value: report.grade } : null,
    {
      label: t('marketplace.report.majorIssues'),
      value: (
        <Badge
          label={report.issues ? String(report.issues) : t('marketplace.report.none')}
          tone={report.issues ? 'danger' : 'success'}
          size="sm"
        />
      ),
    },
    report.inspectorName ? { label: t('marketplace.report.inspectedBy'), value: report.inspectorName } : null,
    report.validUntil
      ? {
          label: report.expired
            ? t('marketplace.report.expiredOn')
            : t('marketplace.report.validUntil'),
          value: formatDate(report.validUntil.slice(0, 10)),
        }
      : null,
  ].filter(Boolean);

  return (
    <KeyValueCard
      dense
      header={
        <AppText variant="title" style={styles.title}>
          {report.turagVerified
            ? t('marketplace.report.turagTitle')
            : t('marketplace.report.title')}
        </AppText>
      }
      rows={
        report.ready
          ? rows
          : [{ label: t('marketplace.report.status'), value: t('marketplace.report.inProgress') }]
      }
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.xs,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
});

export default InspectionSummaryCard;
