import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon, PaymentNotice } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { missingLabel, shotName } from '../labels';
import EstimateCard from '../components/EstimateCard';
import MissingList from '../components/MissingList';
import SectionCard from '../components/SectionCard';
import { useInspectorMode } from '../inspectorMode';

// Estimate (the web's reviewStep): the live estimate (the web's own pricing
// engine over what's confirmed), each step's progress, photos still to take,
// and "Before you can submit" - every entry jumps to where it's done.
function EstimateStep({ si, vehicleLabel, onGoStep, onGoMissing }) {
  const t = useT();
  // The inspector's estimate is advisory - the value is set after Turag's QC.
  const inspector = useInspectorMode();
  const { pricing, progress, missing } = si;
  const missingAngles = si.requiredSlots.filter(s => !(si.mediaShots[s.itemCode] ?? []).includes(s.shotCode));
  const entries = missing.map(entry => ({ ...entry, label: missingLabel(t, entry, si.allItems) }));

  return (
    <View style={styles.wrap}>
      <EstimateCard
        valueMinor={pricing.estimatedPriceMinor}
        lowerMinor={pricing.lowerPriceMinor}
        upperMinor={pricing.upperPriceMinor}
        confidenceLevel={pricing.confidence?.level ?? null}
        vehicleLabel={vehicleLabel || t(inspector ? 'selfInspection.inspector.vehicle' : 'selfInspection.yourVehicle')}
        emptyText={t(si.canonicalReady ? 'selfInspection.estimate.needMore' : 'selfInspection.estimate.confirmFirst')}
        footnote={t(inspector ? 'selfInspection.inspector.estimateFootnote' : 'selfInspection.estimate.liveFootnote')}
      />
      <SectionCard title={t('selfInspection.review.title')} subtitle={t('selfInspection.review.subtitle')}>
        <View style={styles.steps}>
          {['photos', 'documents', 'checklist'].map(key => {
            const p = progress[key];
            const done = p.total === 0 || p.done >= p.total;
            return (
              <Pressable
                key={key}
                onPress={() => onGoStep(key)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.step, done && styles.stepDone, pressed && styles.pressed]}
              >
                <View style={styles.stepTop}>
                  <AppText style={styles.stepTitle}>{t(`selfInspection.step.${key}`)}</AppText>
                  <AppText style={[styles.stepCount, done && { color: colors.success }]}>{`${p.done}/${p.total}`}</AppText>
                </View>
                <View style={styles.bar}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${p.total === 0 ? 100 : Math.round((p.done / p.total) * 100)}%` },
                      done && styles.fillDone,
                    ]}
                  />
                </View>
                <AppText style={styles.stepHint}>{t(done ? 'selfInspection.review.complete' : 'selfInspection.review.continue')}</AppText>
              </Pressable>
            );
          })}
        </View>
        {missingAngles.length > 0 ? (
          <AppText variant="caption">
            {t('selfInspection.review.photosLeft', { list: missingAngles.map(s => shotName(t, s.shotCode)).join(', ') })}
          </AppText>
        ) : null}
        {entries.length > 0 ? (
          <View style={styles.missing}>
            <AppText style={styles.missingTitle}>{t('selfInspection.review.beforeSubmit', { count: entries.length })}</AppText>
            <MissingList entries={entries} onGo={onGoMissing} />
          </View>
        ) : (
          <View style={styles.ready}>
            <Icon name="check" size={ms(15)} color={colors.success} strokeWidth={2.6} />
            <AppText style={styles.readyText}>{t('selfInspection.review.allSet')}</AppText>
          </View>
        )}
        {si.submitError ? (
          <AppText variant="caption" color={colors.danger}>
            {si.submitError}
          </AppText>
        ) : null}
        <PaymentNotice problem={si.payProblem} />
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  steps: {
    gap: spacing.sm,
  },
  step: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepDone: {
    borderColor: colors.successLight,
  },
  pressed: {
    backgroundColor: colors.input,
  },
  stepTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    fontFamily: fonts.title.bold,
    fontSize: fs(14),
    lineHeight: fs(19),
    color: colors.heading,
  },
  stepCount: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(12.5),
    lineHeight: fs(17),
    color: colors.body,
  },
  bar: {
    height: ms(5),
    borderRadius: ms(3),
    overflow: 'hidden',
    backgroundColor: colors.imagePlaceholder,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  fillDone: {
    backgroundColor: colors.success,
  },
  stepHint: {
    fontSize: fs(12),
    lineHeight: fs(16),
    color: colors.body,
  },
  missing: {
    gap: spacing.sm,
  },
  missingTitle: {
    fontFamily: fonts.title.bold,
    fontSize: fs(15),
    lineHeight: fs(20),
    color: colors.heading,
  },
  ready: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.successLight,
  },
  readyText: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(14),
    lineHeight: fs(19),
    color: colors.success,
  },
});

export default EstimateStep;
