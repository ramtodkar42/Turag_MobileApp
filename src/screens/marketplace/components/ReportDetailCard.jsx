import { StyleSheet, View } from 'react-native';
import { AppText, Badge, TitledCard } from '../../../components';
import { colors, spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { codeLabel } from '../../../i18n/vehicleLabels';
import { useT } from '../../../i18n';
import { DOCUMENT_STATUS, SEVERITY } from '../../account/statuses';

// The full public inspection report on the vehicle page, as the web shows
// buyers: the per-group condition breakdown, the findings (worst first) with
// severity + estimated repair cost, and the document checks. Shown only once
// the report is ready. `report` comes from mappers/listing.js (mapReport).
function ReportDetailCard({ report, style }) {
  const t = useT();
  if (!report || !report.ready) {
    return null;
  }
  const hasBreakdown = report.breakdown?.length > 0;
  const hasFindings = report.findings?.length > 0;
  const hasDocuments = report.documents?.length > 0;
  if (!hasBreakdown && !hasFindings && !hasDocuments) {
    return null;
  }

  return (
    <View style={style}>
      {hasBreakdown ? (
        <TitledCard title={t('marketplace.report.breakdown')} style={styles.card}>
          {report.breakdown.map((g, i) => (
            <View key={g.code ?? i} style={[styles.scoreRow, i > 0 && styles.divider]}>
              <AppText variant="label" color={colors.heading} style={styles.flex} numberOfLines={1}>
                {g.label}
              </AppText>
              <AppText variant="label" color={colors.heading}>
                {g.score != null ? `${g.score}/10` : '—'}
              </AppText>
            </View>
          ))}
        </TitledCard>
      ) : null}

      {hasFindings ? (
        <TitledCard title={t('account.report.findings')} style={styles.card}>
          {report.findings.map((f, i) => {
            const sev = SEVERITY[f.severity] ?? SEVERITY.NOT_ASSESSABLE;
            return (
              <View key={f.code ?? i} style={[styles.row, i > 0 && styles.divider]}>
                <View style={styles.rowTop}>
                  <AppText variant="label" color={colors.heading} style={styles.flex}>
                    {f.label}
                  </AppText>
                  <Badge label={t(sev.labelKey)} tone={sev.tone} size="sm" />
                </View>
                {f.note ? (
                  <AppText variant="caption" color={colors.body} style={styles.note}>
                    {f.note}
                  </AppText>
                ) : null}
                {f.cost ? (
                  <AppText variant="caption" style={styles.note}>
                    {t('account.report.repairCost', { amount: formatINR(f.cost) })}
                  </AppText>
                ) : null}
              </View>
            );
          })}
        </TitledCard>
      ) : null}

      {hasDocuments ? (
        <TitledCard title={t('account.report.documents')} style={styles.card}>
          {report.documents.map((d, i) => {
            const st = DOCUMENT_STATUS[d.status] ?? DOCUMENT_STATUS.NOT_ASSESSED;
            return (
              <View key={`${d.type}-${i}`} style={[styles.docRow, i > 0 && styles.divider]}>
                <AppText variant="label" color={colors.heading} style={styles.flex} numberOfLines={1}>
                  {codeLabel(t, 'account.report.doc', d.type, d.type)}
                </AppText>
                <Badge label={t(st.labelKey)} tone={st.tone} size="sm" />
              </View>
            );
          })}
        </TitledCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  row: {
    paddingVertical: spacing.sm,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  note: {
    marginTop: spacing.xxs,
    fontSize: fs(12),
    lineHeight: fs(17),
  },
  flex: {
    flex: 1,
  },
});

export default ReportDetailCard;
