import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Badge,
  Button,
  ButtonRow,
  Card,
  CardListSkeleton,
  FadeIn,
  Header,
  ScreenContainer,
  StatusView,
} from '../../../components';
import { colors, fonts, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { useT } from '../../../i18n';
import { ROUTES } from '../../../navigation/routes';
import { currentHomeRoute } from '../../../navigation/homeRoute';
import { pickImageFromGallery } from '../../../utils/pickImage';
import { pickPdf } from '../../../utils/pickDocument';
import { pickVideoFromGallery, recordVideo } from '../../../utils/pickVideo';
import { warmPhotoLocation } from '../../../utils/photoLocation';
import { saveToGarage, useIsInGarage } from '../../../store/garageStore';
import useLeaveGuard from './useLeaveGuard';
import useSelfInspection, { slotKey } from './useSelfInspection';
import { STEPS } from './constants';
import ProgressRing from './components/ProgressRing';
import StepTabs from './components/StepTabs';
import RetakeBanner from './components/RetakeBanner';
import { InspectorModeContext } from './inspectorMode';
import PhotosStep from './steps/PhotosStep';
import DocumentsStep from './steps/DocumentsStep';
import ChecklistStep from './steps/ChecklistStep';
import EstimateStep from './steps/EstimateStep';
import SubmittedView from './steps/SubmittedView';

const inr = minor => formatINR(Math.round(minor / 100));
// Let a bottom sheet finish closing before a picker opens over it.
const AFTER_SHEET_MS = 350;

// The customer's own self-inspection (M1), the same process as the web's
// /inspect/[id]: Photos -> Documents -> Checklist -> Estimate, with "X of Y
// done", a live estimate, and Submit once nothing's left. Then the final value.
// The inspection officer's doorstep inspection (M2) uses this same screen, as
// the web's inspector capture is the M1 flow's M2 equivalent: inspector
// wording, the 10 "can't check" reasons, and after submit it goes to Turag's
// QC and back to the jobs (see inspectorMode.js).
// params: { inspectionId, vehicle?, valuation? } (from Evaluate / Garage),
//   or { inspectionId, bookingId } (an inspector's job).
function SelfInspection({ navigation, route }) {
  const t = useT();
  const { inspectionId, vehicle, valuation, bookingId } = route.params ?? {};
  const si = useSelfInspection(inspectionId);
  const inspector = !!bookingId || si.inspection?.mode === 'M2';
  const titleKey = inspector ? 'selfInspection.inspector.title' : 'selfInspection.title';
  const [step, setStep] = useState('photos');
  const [qIndex, setQIndex] = useState(0);
  const [docIndex, setDocIndex] = useState(null); // null = the first document still to do
  // Set when a step was opened from Estimate's "what's left" list: back returns there.
  const [returnTo, setReturnTo] = useState(null);
  const [focusItem, setFocusItem] = useState(null);
  const [savingGarage, setSavingGarage] = useState(false);
  const initialStepChosen = useRef(false);
  const scrollRef = useRef(null);
  // Camera shots waiting to come back: key -> { itemCode, shotCode, kind, replace }.
  const pending = useRef({});
  const inGarage = useIsInGarage(vehicle?.vehicleId);

  // Open on the first step that still needs work (once per visit).
  useEffect(() => {
    if (si.screen !== 'ready' || initialStepChosen.current || si.allItems.length === 0) return;
    initialStepChosen.current = true;
    const p = si.progress;
    setStep(
      p.photos.done < p.photos.total
        ? 'photos'
        : p.documents.done < p.documents.total
        ? 'documents'
        : p.checklist.done < p.checklist.total
        ? 'checklist'
        : 'review',
    );
  }, [si.screen, si.allItems.length, si.progress]);

  useEffect(() => {
    if (si.screen === 'loading') initialStepChosen.current = false;
  }, [si.screen]);

  const goStep = useCallback(next => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // Back on Estimate: nothing to return to any more.
  useEffect(() => {
    if (step === 'review') setReturnTo(null);
  }, [step]);

  // "Back" (phone back button, header arrow) steps back through the process
  // instead of closing it: Estimate -> Checklist -> previous question ->
  // Documents -> previous document -> Photos -> leave (everything is saved).
  const stepBack = () => {
    // Opened from Estimate's "what's left" list: back returns there.
    if (returnTo) {
      goStep(returnTo);
      return true;
    }
    if (step === 'review') {
      goStep('checklist');
      return true;
    }
    if (step === 'checklist') {
      if (qIndex > 0) {
        setQIndex(qIndex - 1);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        goStep('documents');
      }
      return true;
    }
    if (step === 'documents') {
      const docs = si.partition.documents;
      const firstOpen = docs.findIndex(d => !si.local[d.item_code]?.saved);
      const current = docIndex ?? (firstOpen >= 0 ? firstOpen : 0);
      if (current > 0) {
        setDocIndex(current - 1);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        goStep('photos');
      }
      return true;
    }
    return false; // Photos: leave the self-inspection
  };
  useLeaveGuard({
    navigation,
    enabled: si.screen === 'ready',
    onBack: stepBack,
    confirmLeave: leave => leave(),
  });

  // A photo from the in-app camera comes back here.
  const captured = route.params?.captured;
  const { addEvidence } = si;
  useEffect(() => {
    if (!captured) return;
    navigation.setParams({ captured: undefined });
    const target = pending.current[captured.key];
    delete pending.current[captured.key];
    if (target) {
      addEvidence(target.itemCode, captured.file, target.kind, target.shotCode, target.replace);
    }
  }, [captured, navigation, addEvidence]);

  const openCamera = (itemCode, shotCode, title, kind, replace) => {
    const key = slotKey(itemCode, shotCode);
    pending.current[key] = { itemCode, shotCode, kind, replace };
    navigation.navigate(ROUTES.VEHICLE_CAMERA, { shot: { key, title }, returnTo: ROUTES.SELF_INSPECTION });
  };

  // A car photo for an angle: always taken now with the in-app camera (no
  // gallery), so every angle is a fresh photo of the car in front of the user.
  const onTakePhoto = (itemCode, shotCode, label, replace) => {
    warmPhotoLocation();
    openCamera(itemCode, shotCode, label, 'PHOTO', replace);
  };

  // The gallery / PDF picker / camera couldn't give a file: say so under that
  // item (a camera turned off for good also opens the Settings dialog).
  const pickFailed = (itemCode, shotCode, e) =>
    si.showMsg(slotKey(itemCode, shotCode), {
      kind: 'error',
      text: t(e?.message === 'camera_permission' ? 'verify.error.camera' : 'selfInspection.error.pickFailed'),
    });

  // A document (or a single photo) from the camera, the gallery or a PDF.
  const onAddDocument = (item, shotCode, kind, source) => {
    warmPhotoLocation();
    if (source === 'camera') {
      openCamera(item.item_code, shotCode, item.label, kind, false);
      return;
    }
    setTimeout(async () => {
      try {
        const file = source === 'pdf' ? await pickPdf() : await pickImageFromGallery();
        if (file) si.addEvidence(item.item_code, file, kind, shotCode, false);
      } catch (e) {
        // (Cancelling isn't an error: the picker returns nothing.)
        pickFailed(item.item_code, shotCode, e);
      }
    }, AFTER_SHEET_MS);
  };

  const onAddVideo = (item, shotCode, have, source) => {
    warmPhotoLocation();
    setTimeout(async () => {
      try {
        const file = source === 'record' ? await recordVideo() : await pickVideoFromGallery();
        if (file) si.addEvidence(item.item_code, file, 'VIDEO', shotCode, have);
      } catch (e) {
        pickFailed(item.item_code, shotCode, e);
      }
    }, AFTER_SHEET_MS);
  };

  // "What's left": jump to the step, opened on that photo group / document /
  // question - and remember to come back to Estimate on "back".
  const goMissing = entry => {
    if (entry.step === 'checklist' && entry.itemCode) {
      const i = si.partition.checklist.findIndex(x => x.item_code === entry.itemCode);
      if (i >= 0) setQIndex(i);
    }
    if ((entry.step === 'documents' || entry.step === 'photos') && entry.itemCode) {
      setFocusItem(entry.itemCode);
      setTimeout(() => setFocusItem(null), 300);
    }
    goStep(entry.step);
    setReturnTo('review');
  };

  // Choosing a step yourself (tabs, Back / Next) is ordinary navigation again.
  const selectStep = next => {
    setReturnTo(null);
    goStep(next);
  };

  // Garage: the vehicle is saved there first (with its final value) if it isn't yet.
  const onGarage = async () => {
    const value = si.final.valuation ?? valuation;
    if (vehicle && value && !inGarage) {
      setSavingGarage(true);
      try {
        const saved = await saveToGarage({ vehicle, valuation: value, inspected: true });
        navigation.reset({
          index: 1,
          routes: [
            { name: currentHomeRoute(), params: { screen: ROUTES.GARAGE } },
            { name: ROUTES.GARAGE_VEHICLE, params: { vehicle: saved } },
          ],
        });
        return;
      } catch {
        // open the Garage anyway
      } finally {
        setSavingGarage(false);
      }
    }
    navigation.reset({ index: 0, routes: [{ name: currentHomeRoute(), params: { screen: ROUTES.GARAGE } }] });
  };

  // Inspector: back to the jobs list (the job now shows the inspection as sent).
  const onBackToJobs = () =>
    navigation.reset({ index: 0, routes: [{ name: ROUTES.INSPECTOR_TABS, params: { screen: ROUTES.INSPECTIONS } }] });

  const onEvaluateAnother = () =>
    navigation.reset({ index: 1, routes: [{ name: currentHomeRoute() }, { name: ROUTES.EVALUATE_CHAT }] });

  const v = si.inspection?.vehicle;
  const vehicleLabel =
    [v?.make, v?.model, v?.variant].filter(Boolean).join(' ') + (v?.mfg_year ? ` · ${v.mfg_year}` : '');
  const header = <Header onBack={navigation.goBack} title={t(titleKey)} />;

  if (si.screen === 'loading') {
    return (
      <ScreenContainer header={header}>
        <CardListSkeleton cards={[2, 3, 3]} style={styles.skeleton} />
      </ScreenContainer>
    );
  }
  if (si.screen === 'error') {
    return (
      <ScreenContainer header={header}>
        <StatusView title={t('selfInspection.loadErrorTitle')} message={t('selfInspection.loadErrorText')}>
          <Button title={t('common.retry')} onPress={si.reload} />
        </StatusView>
      </ScreenContainer>
    );
  }
  if (si.screen === 'not-editable') {
    return (
      <ScreenContainer header={header}>
        <StatusView title={t('selfInspection.notReadyTitle')} message={t('selfInspection.notReadyText')}>
          {inspector ? (
            <Button title={t('selfInspection.inspector.backToJobs')} onPress={onBackToJobs} />
          ) : (
            <Button title={t('selfInspection.submitted.garage')} onPress={onGarage} />
          )}
        </StatusView>
      </ScreenContainer>
    );
  }
  if (si.screen === 'submitted') {
    return (
      <ScreenContainer scroll header={header}>
        <SubmittedView
          si={si}
          vehicleLabel={vehicleLabel}
          savingGarage={savingGarage}
          onFixPhotos={si.fixPhotos}
          onGarage={onGarage}
          onEvaluateAnother={onEvaluateAnother}
          inspector={inspector}
          onBackToJobs={onBackToJobs}
        />
      </ScreenContainer>
    );
  }

  const { progress, missing, pricing } = si;
  const stepIdx = STEPS.indexOf(step);
  const nextStep = STEPS[stepIdx + 1];
  const prevStep = STEPS[stepIdx - 1];
  const totalDone = progress.photos.done + progress.documents.done + progress.checklist.done;
  const totalAll = progress.photos.total + progress.documents.total + progress.checklist.total;
  const canSubmit = missing.length === 0;
  const estimateText =
    pricing.estimatedPriceMinor != null ? `≈ ${inr(pricing.estimatedPriceMinor)}` : t('selfInspection.estimate.tabEmpty');

  const footer = (
    <View style={styles.bar}>
      <AppText variant="caption" align="center" numberOfLines={2}>
        {si.payPhase
          ? t(`selfInspection.pay.phase.${si.payPhase}`)
          : step === 'review'
          ? canSubmit
            ? t('selfInspection.bar.ready')
            : t('selfInspection.bar.left', { count: missing.length })
          : t('selfInspection.bar.step', { n: stepIdx + 1, total: STEPS.length, hint: t(`selfInspection.hint.${step}`) })}
      </AppText>
      <ButtonRow>
        {prevStep ? (
          <Button
            title={t('selfInspection.back')}
            variant="outline"
            fullWidth={false}
            disabled={si.submitting}
            onPress={() => selectStep(prevStep)}
            style={styles.flex}
          />
        ) : null}
        {nextStep ? (
          <Button
            title={t('selfInspection.next', { step: t(`selfInspection.step.${nextStep}`) })}
            fullWidth={false}
            onPress={() => selectStep(nextStep)}
            style={styles.flexWide}
          />
        ) : (
          <Button
            title={t(inspector ? 'selfInspection.inspector.submit' : 'selfInspection.submit')}
            fullWidth={false}
            loading={si.submitting}
            disabled={si.submitting || !canSubmit}
            onPress={si.submit}
            style={styles.flexWide}
          />
        )}
      </ButtonRow>
    </View>
  );

  return (
    <InspectorModeContext.Provider value={inspector}>
    <ScreenContainer scroll scrollRef={scrollRef} header={header} footer={footer}>
      {/* Summary: progress, the vehicle, and the live estimate (green, as the app's value card). */}
      <Card style={styles.hero}>
        <View style={styles.heroRow}>
          <ProgressRing fraction={totalAll > 0 ? totalDone / totalAll : 0} />
          <View style={styles.heroText}>
            <AppText variant="h3" style={styles.heroTitle}>
              {t(titleKey)}
            </AppText>
            {vehicleLabel ? (
              <AppText variant="label" color={colors.heading} numberOfLines={1}>
                {vehicleLabel}
              </AppText>
            ) : null}
            <AppText variant="caption">{t('selfInspection.doneShort', { done: totalDone, total: totalAll })}</AppText>
          </View>
        </View>
        <View style={styles.heroFoot}>
          {/* A Turag inspector's report goes to QC (it can become Turag Verified); the owner's own is self-declared. */}
          <Badge
            size="sm"
            tone="neutral"
            label={t(inspector ? 'selfInspection.inspector.badge' : 'selfInspection.selfDeclared')}
          />
          {pricing.estimatedPriceMinor != null ? (
            <Pressable onPress={() => goStep('review')} accessibilityRole="button" hitSlop={8} style={styles.live}>
              <AppText variant="caption" color={colors.heading}>
                {t('selfInspection.liveEstimate')}
              </AppText>
              <AppText style={styles.liveValue}>{inr(pricing.estimatedPriceMinor)}</AppText>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <RetakeBanner shots={si.retakeShots} items={si.allItems} style={styles.retake} />

      <StepTabs current={step} progress={progress} estimateLabel={estimateText} onSelect={selectStep} />

      <View style={styles.body}>
        <FadeIn key={step} offset={ms(10)}>
          {step === 'photos' ? <PhotosStep si={si} focusItem={focusItem} onTakePhoto={onTakePhoto} onAddVideo={onAddVideo} /> : null}
          {step === 'documents' ? (
            <DocumentsStep
              si={si}
              docIndex={docIndex}
              onDocIndex={setDocIndex}
              focusItem={focusItem}
              onAddDocument={onAddDocument}
              onGoStep={goStep}
            />
          ) : null}
          {step === 'checklist' ? (
            <ChecklistStep si={si} qIndex={qIndex} onQuestion={setQIndex} onGoStep={goStep} onAddDocument={onAddDocument} />
          ) : null}
          {step === 'review' ? <EstimateStep si={si} vehicleLabel={vehicleLabel} onGoStep={goStep} onGoMissing={goMissing} /> : null}
        </FadeIn>
      </View>
    </ScreenContainer>
    </InspectorModeContext.Provider>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    marginTop: spacing.lg,
  },
  hero: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroText: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroTitle: {
    fontSize: fs(19),
    lineHeight: fs(25),
  },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  live: {
    alignItems: 'flex-end',
  },
  liveValue: {
    fontFamily: fonts.title.bold,
    fontSize: fs(18),
    lineHeight: fs(24),
    color: colors.success,
  },
  body: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  retake: {
    marginTop: spacing.md,
  },
  bar: {
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  flexWide: {
    flex: 1.6,
  },
});

export default SelfInspection;
