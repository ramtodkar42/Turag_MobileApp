import { StyleSheet, View } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Badge,
  Button,
  Card,
  CardListSkeleton,
  Divider,
  FadeIn,
  Header,
  InfoNote,
  ScreenContainer,
  StatusView,
  TitledCard,
  ChallanCard,
} from '../../../components';
import { colors, fonts, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatDate, formatINR, formatNumber } from '../../../utils/format';
import { formatRegNumber } from '../../../utils/validators';
import useRemoteData from '../../../hooks/useRemoteData';
import {
  getInspectionReport,
  REPORT_ERRORS,
} from '../../../api/services/report.api';
import { codeLabel } from '../../../i18n/vehicleLabels';
import { useT } from '../../../i18n';
import EstimateSummary from '../../valuation/components/EstimateSummary';
import { DOCUMENT_STATUS, SEVERITY } from '../statuses';
import ReportActions from './components/ReportActions';
import VerifyReportCard from './components/VerifyReportCard';
import useReportActions from './useReportActions';

const titleCase = code =>
  String(code ?? '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

// The inspection report for a booking (as the web's report page): grade and
// score, verification, the Turag value with price bands, findings (worst
// first) and documents; Download PDF and Share report at the bottom.
// params: { inspectionId }
function InspectionReport({ navigation, route }) {
  const t = useT();
  const { inspectionId } = route.params;
  const {
    data: report,
    loading,
    refreshing,
    error,
    errorCode,
    refresh,
    reload,
  } = useRemoteData(() => getInspectionReport(inspectionId), [inspectionId]);
  const reportName = report
    ? [report.vehicle.make, report.vehicle.model, report.vehicle.year]
        .filter(Boolean)
        .join(' ')
    : '';
  const actions = useReportActions({
    inspectionId,
    title: reportName || t('account.report.title'),
  });

  const header = (
    <Header onBack={navigation.goBack} title={t('account.report.title')} />
  );

  if (loading) {
    return (
      <ScreenContainer scroll header={header}>
        <CardListSkeleton cards={[3, 4, 5, 3]} style={styles.card} />
      </ScreenContainer>
    );
  }
  if (error) {
    const notReady = errorCode === REPORT_ERRORS.NOT_READY;
    const forbidden = errorCode === 'NOT_FOUND' || errorCode === 'FORBIDDEN';
    let title = t('account.report.error.title');
    let message = error;
    if (notReady) {
      title = t('account.report.notReady.title');
      message = t('account.report.notReady.message');
    } else if (forbidden) {
      title = t('account.report.forbidden.title');
      message = t('account.report.forbidden.message');
    }
    return (
      <ScreenContainer header={header}>
        <StatusView title={title} message={message}>
          <Button
            title={
              notReady || !forbidden ? t('common.retry') : t('common.back')
            }
            size="md"
            onPress={notReady || !forbidden ? reload : navigation.goBack}
            style={styles.action}
          />
        </StatusView>
      </ScreenContainer>
    );
  }

  const { vehicle } = report;
  const name = reportName;

  return (
    <ScreenContainer
      scroll
      header={header}
      footer={<ReportActions actions={actions} />}
      refreshControl={
        <AppRefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <FadeIn>
        {/* Grade + verification */}
        <Card style={styles.card}>
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <AppText variant="h3" style={styles.name}>
                {name}
              </AppText>
              {vehicle.registrationNumber ? (
                <AppText variant="caption">
                  {formatRegNumber(vehicle.registrationNumber)}
                </AppText>
              ) : null}
              <Badge
                label={t(
                  report.turagVerified
                    ? 'account.report.turagVerified'
                    : 'account.report.notTuragVerified',
                )}
                tone={report.turagVerified ? 'verified' : 'neutral'}
                style={styles.badge}
              />
            </View>
            <View style={[styles.grade, !report.grade && styles.gradeEmpty]}>
              <AppText
                style={styles.gradeText}
                color={report.grade ? colors.white : colors.body}
              >
                {report.grade ?? '—'}
              </AppText>
              <AppText
                variant="caption"
                color={report.grade ? colors.white : colors.body}
                style={styles.gradeLabel}
              >
                {t('account.report.grade')}
              </AppText>
            </View>
          </View>

          <Divider spacing={spacing.md} />
          <View style={styles.stats}>
            <Stat
              label={t('account.report.score')}
              value={report.score != null ? `${report.score}/100` : '—'}
            />
            <Stat
              label={t('account.report.checked')}
              value={report.coverage != null ? `${report.coverage}%` : '—'}
            />
            <Stat
              label={t('account.report.issues')}
              value={String(report.issues)}
            />
          </View>
          {report.gradeNotReady ? (
            <AppText variant="caption" style={styles.note}>
              {t('account.report.gradeNotReady')}
            </AppText>
          ) : null}
          {report.validUntil ? (
            <AppText
              variant="caption"
              color={report.expired ? colors.danger : undefined}
              style={styles.note}
            >
              {t(
                report.expired
                  ? 'account.report.expired'
                  : 'account.report.validUntil',
                {
                  date: formatDate(report.validUntil.slice(0, 10)),
                },
              )}
            </AppText>
          ) : null}
        </Card>

        {/* Value */}
        {report.valuation ? (
          <EstimateSummary
            vehicle={vehicle}
            valuation={report.valuation}
            label={t('account.report.value')}
            description={t('account.report.valueNote')}
            style={styles.card}
          />
        ) : null}

        {/* Findings */}
        <TitledCard title={t('account.report.findings')} style={styles.card}>
          {report.findings.length === 0 ? (
            <AppText variant="subtitle" style={styles.empty}>
              {t('account.report.noFindings')}
            </AppText>
          ) : (
            report.findings.map((finding, index) => {
              const severity =
                SEVERITY[finding.severity] ?? SEVERITY.NOT_ASSESSABLE;
              return (
                <View
                  key={finding.code ?? index}
                  style={[styles.row, index > 0 && styles.rowDivider]}
                >
                  <View style={styles.rowTop}>
                    <AppText
                      variant="label"
                      color={colors.heading}
                      style={styles.rowTitle}
                    >
                      {finding.label}
                    </AppText>
                    <Badge
                      label={t(severity.labelKey)}
                      tone={severity.tone}
                      size="sm"
                    />
                  </View>
                  {finding.note ? (
                    <AppText
                      variant="caption"
                      color={colors.body}
                      style={styles.rowNote}
                    >
                      {finding.note}
                    </AppText>
                  ) : null}
                  {finding.cost ? (
                    <AppText variant="caption" style={styles.rowNote}>
                      {t('account.report.repairCost', {
                        amount: formatINR(finding.cost),
                      })}
                    </AppText>
                  ) : null}
                </View>
              );
            })
          )}
        </TitledCard>

        {/* Documents */}
        {report.documents.length > 0 ? (
          <TitledCard title={t('account.report.documents')} style={styles.card}>
            {report.documents.map((doc, index) => {
              const status =
                DOCUMENT_STATUS[doc.status] ?? DOCUMENT_STATUS.NOT_ASSESSED;
              return (
                <View
                  key={`${doc.type}-${index}`}
                  style={[styles.docRow, index > 0 && styles.rowDivider]}
                >
                  <AppText
                    variant="label"
                    color={colors.heading}
                    style={styles.rowTitle}
                  >
                    {codeLabel(
                      t,
                      'account.report.doc',
                      doc.type,
                      titleCase(doc.type),
                    )}
                  </AppText>
                  <Badge
                    label={t(status.labelKey)}
                    tone={status.tone}
                    size="sm"
                  />
                </View>
              );
            })}
          </TitledCard>
        ) : null}

        {/* Traffic challans: only when a check has run (as the web). */}
        {report.challans ? (
          <ChallanCard challans={report.challans} style={styles.card} />
        ) : null}

        {report.inspectorName || report.odometerKm != null ? (
          <InfoNote style={styles.card}>
            {[
              report.inspectorName
                ? t('account.report.inspectedBy', {
                    name: report.inspectorName,
                  })
                : null,
              report.odometerKm != null
                ? t('account.report.odometer', {
                    km: formatNumber(report.odometerKm),
                  })
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </InfoNote>
        ) : null}

        {/* Anyone can check the report is genuine (as the web report's last line). */}
        <VerifyReportCard token={report.verificationToken} style={styles.card} />

        {report.disclaimer ? (
          <AppText variant="caption" style={styles.disclaimer}>
            {report.disclaimer}
          </AppText>
        ) : null}
      </FadeIn>
    </ScreenContainer>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <AppText variant="h3" style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const GRADE = ms(64);

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroText: {
    flex: 1,
  },
  name: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  badge: {
    marginTop: spacing.sm,
  },
  grade: {
    width: GRADE,
    height: GRADE,
    borderRadius: GRADE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  gradeEmpty: {
    backgroundColor: colors.input,
  },
  gradeText: {
    fontFamily: fonts.title.black,
    fontSize: fs(24),
    lineHeight: fs(28),
  },
  gradeLabel: {
    fontSize: fs(9),
    lineHeight: fs(11),
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fs(17),
    lineHeight: fs(23),
  },
  note: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  empty: {
    marginTop: spacing.sm,
  },
  row: {
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: {
    flex: 1,
  },
  rowNote: {
    marginTop: spacing.xxs,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  disclaimer: {
    marginTop: spacing.lg,
    fontSize: fs(11),
    lineHeight: fs(16),
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default InspectionReport;
