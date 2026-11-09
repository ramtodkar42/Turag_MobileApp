import { StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, IconTile, PopIn } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { integrityReasonLines } from '../integrityReasons';
import EstimateCard from '../components/EstimateCard';
import SectionCard from '../components/SectionCard';

// After submitting (the web's submitted screen): done with the final
// estimated value from Turag's valuation engine - or, when photos failed the
// integrity checks, which ones and "Retake photos".
// inspector: the inspection officer's doorstep inspection - it goes to Turag's
// QC (the web's PENDING_QC), and the way on is back to the jobs.
function SubmittedView({
  si,
  vehicleLabel,
  savingGarage,
  onFixPhotos,
  onGarage,
  onEvaluateAnother,
  inspector = false,
  onBackToJobs,
}) {
  const t = useT();
  const failed = si.finalStatus === 'INTEGRITY_FAILED';
  const doneKey = inspector ? 'selfInspection.inspector.sent' : 'selfInspection.submitted';
  // Each failed photo with why (as the web): an exact copy, used elsewhere, a screenshot.
  const reasons = integrityReasonLines(t, si.integrityItems, si.allItems);
  // The owner's value rests on their own answers; the inspector's on this inspection.
  let footnoteKey = inspector ? 'selfInspection.submitted.footnoteInspector' : 'selfInspection.submitted.footnote';
  if (si.final.adjusted) {
    footnoteKey = inspector ? 'selfInspection.submitted.adjustedInspector' : 'selfInspection.submitted.adjusted';
  }

  return (
    <View style={styles.wrap}>
      <SectionCard style={styles.center}>
        <PopIn>
          {failed ? (
            <IconTile name="camera" size={ms(72)} color={colors.warning} backgroundColor={colors.warningLight} style={styles.round} />
          ) : (
            <View style={styles.done}>
              <Icon name="check" size={ms(38)} color={colors.success} strokeWidth={2.8} />
            </View>
          )}
        </PopIn>
        <AppText variant="h3" align="center">
          {t(failed ? 'selfInspection.submitted.failedTitle' : `${doneKey}.title`)}
        </AppText>
        <AppText variant="subtitle" align="center">
          {t(failed ? 'selfInspection.submitted.failedText' : `${doneKey}.text`)}
        </AppText>
        {failed && reasons.length > 0 ? (
          <View style={styles.reasons}>
            {reasons.map(line => (
              <AppText key={line.id} variant="body" color={colors.heading}>
                {`•  ${line.text}`}
              </AppText>
            ))}
          </View>
        ) : null}
        {si.submitError ? (
          <AppText variant="caption" color={colors.danger} align="center">
            {si.submitError}
          </AppText>
        ) : null}
      </SectionCard>

      {!failed ? (
        <EstimateCard
          label={inspector ? undefined : t('selfInspection.estimate.dealerPays')}
          valueMinor={si.final.card?.valueMinor ?? null}
          lowerMinor={null}
          upperMinor={null}
          confidenceLevel={si.final.card?.confidenceLevel ?? null}
          vehicleLabel={vehicleLabel || t(inspector ? 'selfInspection.thisVehicle' : 'selfInspection.yourVehicle')}
          loading={si.final.loading}
          emptyText={si.final.error || si.final.note || t('selfInspection.submitted.preparing')}
          footnote={t(footnoteKey)}
        />
      ) : null}

      <View style={styles.actions}>
        {failed ? (
          <Button title={t('selfInspection.submitted.retake')} variant="primary" loading={si.reopening} onPress={onFixPhotos} />
        ) : null}
        {inspector ? (
          <Button
            title={t('selfInspection.inspector.backToJobs')}
            variant={failed ? 'outline' : 'primary'}
            onPress={onBackToJobs}
          />
        ) : (
          <>
            <Button
              title={t('selfInspection.submitted.garage')}
              variant={failed ? 'outline' : 'primary'}
              loading={savingGarage}
              onPress={onGarage}
            />
            <Button title={t('selfInspection.submitted.another')} variant="outline" onPress={onEvaluateAnother} />
          </>
        )}
      </View>
    </View>
  );
}

const DONE = ms(76);

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  center: {
    alignItems: 'center',
  },
  round: {
    borderRadius: ms(36),
  },
  done: {
    width: DONE,
    height: DONE,
    borderRadius: DONE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.success,
  },
  reasons: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  actions: {
    gap: spacing.sm,
  },
});

export default SubmittedView;
