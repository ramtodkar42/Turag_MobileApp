import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  ButtonRow,
  CardListSkeleton,
  CheckCircle,
  FadeIn,
  Header,
  InfoNote,
  ScreenContainer,
  StatusView,
} from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { resumeInspection, submitForQc } from '../../../api/services/inspector.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import CaptureStep from './components/CaptureStep';
import ReviewList from './components/ReviewList';
import useCapture, { isAnswered } from './useCapture';
import useCaptureNav, { forgetCaptureStep } from './useCaptureNav';
import useLeaveGuard from './useLeaveGuard';
import getSelfEstimate from '../../valuation/selfEstimate';

// The inspection itself (as the web's capture wizard): one checklist item per
// step - answers save as you go, photos upload from the in-app camera - then
// a review of what's done / missing, and "Submit for QC". After submitting:
// sent for QC, or some photos failed checks (fix them and submit again).
// An item opened from Review returns to Review ("Back to review" / "Next
// issue"); back steps through the wizard and asks before leaving it; reopening
// continues where the inspector left off (useCaptureNav).
// The customer's self-inspection (variant 'self', M1 checklist, as the web's
// /inspect page) is the same wizard, step 1 to the last; once submitted it
// shows the final estimate.
// params: { inspectionId, bookingId } | { inspectionId, variant: 'self', vehicle, condition, valuation }
function Capture({ navigation, route }) {
  const t = useT();
  const { inspectionId, variant, vehicle: selfVehicle, condition, valuation } = route.params;
  const isSelf = variant === 'self';
  const capture = useCapture({ inspectionId, navigation, route });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null); // status after submitting
  const scroll = useRef(null);
  const { confirm, dialog } = useConfirmDialog();

  const { items } = capture;
  const total = items.length;
  const nav = useCaptureNav({ inspectionId, total, problems: capture.problems });
  const status = result ?? capture.data?.inspection.status;

  // Self-inspection: the final estimate, then the result screen.
  const showEstimate = async () => {
    let finalValuation = valuation;
    try {
      finalValuation = await getSelfEstimate({ vehicle: selfVehicle, condition, inspectionId, fallback: valuation });
    } catch {
      // Keep the earlier estimate; the inspection itself is already submitted.
    }
    navigation.navigate(ROUTES.VALUATION_RESULT, { vehicle: selfVehicle, valuation: finalValuation, inspected: true });
  };

  // Every move starts the new step at the top.
  const scrolled = action => (...args) => {
    action(...args);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const goTo = scrolled(nav.goTo);

  useLeaveGuard({
    navigation,
    enabled: status === 'IN_PROGRESS',
    onBack: () => {
      const handled = nav.back();
      scroll.current?.scrollTo({ y: 0, animated: false });
      return handled;
    },
    confirmLeave: useCallback(
      leave =>
        confirm({
          title: t('inspector.capture.leaveTitle'),
          message: t('inspector.capture.leaveMessage'),
          confirmLabel: t('inspector.capture.leave'),
          cancelLabel: t('inspector.capture.stay'),
          onConfirm: leave,
        }),
      [confirm, t],
    ),
  });

  const header = (
    <Header onBack={navigation.goBack} title={t(isSelf ? 'valuation.self.title' : 'inspector.capture.title')} />
  );

  if (capture.loading || !nav.ready) {
    return (
      <ScreenContainer scroll header={header}>
        <CardListSkeleton cards={[1, 4, 2]} style={styles.top} />
      </ScreenContainer>
    );
  }
  if (capture.error) {
    return (
      <ScreenContainer header={header}>
        <StatusView title={t('inspector.capture.errorTitle')} message={capture.error}>
          <Button title={t('common.retry')} size="md" onPress={capture.reload} style={styles.action} />
        </StatusView>
      </ScreenContainer>
    );
  }

  const { inspection } = capture.data;
  const backToJobs = () => navigation.navigate(ROUTES.INSPECTOR_TABS, { screen: ROUTES.INSPECTIONS });

  // Submitted (or already past capture).
  if (status !== 'IN_PROGRESS') {
    const failed = status === 'INTEGRITY_FAILED';
    const doneText = isSelf
      ? { title: 'valuation.self.submittedTitle', message: 'valuation.self.submittedMessage' }
      : { title: 'inspector.submitted.title', message: 'inspector.submitted.message' };
    return (
      <ScreenContainer header={header}>
        <FadeIn style={styles.flex}>
          <StatusView
            icon={failed ? null : <CheckCircle size={ms(56)} />}
            title={t(failed ? 'inspector.submitted.failedTitle' : doneText.title)}
            message={t(failed ? 'inspector.submitted.failedMessage' : doneText.message)}
          >
            {failed ? (
              <Button
                title={t('inspector.submitted.fix')}
                size="md"
                onPress={async () => {
                  await resumeInspection(inspectionId, { self: isSelf });
                  setResult(null);
                  capture.reload();
                }}
                style={styles.action}
              />
            ) : null}
            {isSelf ? (
              !failed ? (
                <Button
                  title={t('valuation.self.seeEstimate')}
                  size="md"
                  onPress={showEstimate}
                  style={styles.action}
                />
              ) : null
            ) : (
              <Button
                title={t('inspector.submitted.back')}
                size="md"
                variant={failed ? 'outline' : 'primary'}
                onPress={backToJobs}
                style={styles.action}
              />
            )}
          </StatusView>
        </FadeIn>
      </ScreenContainer>
    );
  }

  const { step, reviewing, fixing } = nav;
  const item = items[step];

  const onSubmit = async () => {
    console.info('[SelfInspection] Submit diagnostics', {
      inspectionId,
      mode: inspection.mode,
      itemCount: items.length,
      items: items.map((checklistItem, index) => {
        const answer = capture.answers[checklistItem.code];
        return {
          index: index + 1,
          code: checklistItem.code,
          mandatory: checklistItem.mandatory,
          severity: answer?.severity ?? null,
          answered: isAnswered(answer),
          saveState: capture.saveState[checklistItem.code] ?? 'not-saved',
        };
      }),
      problems: capture.problems.map(problem => ({
        index: problem.index + 1,
        code: problem.item.code,
        kind: problem.kind,
      })),
    });
    setSubmitting(true);
    setSubmitError('');
    try {
      const { status: next } = await submitForQc(inspectionId);
      const sent = (next ?? 'PENDING_QC') !== 'INTEGRITY_FAILED';
      if (sent) {
        forgetCaptureStep(inspectionId);
      }
      if (sent && isSelf) {
        await showEstimate();
      }
      setResult(next ?? 'PENDING_QC');
    } catch (e) {
      console.error('[SelfInspection] Submit failed', {
        inspectionId,
        message: e.message,
        status: e.status ?? null,
        code: e.code ?? null,
        requestId: e.requestId ?? null,
        details: e.details ?? null,
      });
      setSubmitError(e.message || t('inspector.capture.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  // Opened from Review: back to it, or straight on to the next item to fix.
  const fixingFooter = nav.otherIssues.length ? (
    <ButtonRow>
      <Button
        title={t('inspector.capture.backToReview')}
        variant="outline"
        onPress={scrolled(nav.backToReview)}
        style={styles.flex}
      />
      <Button title={t('inspector.capture.nextIssue')} onPress={scrolled(nav.nextIssue)} style={styles.flex} />
    </ButtonRow>
  ) : (
    <Button title={t('inspector.capture.backToReview')} onPress={scrolled(nav.backToReview)} />
  );

  const footer = fixing && !reviewing ? (
    fixingFooter
  ) : reviewing ? (
    <ButtonRow>
      <Button title={t('inspector.capture.back')} variant="outline" onPress={() => goTo(total - 1)} style={styles.flex} />
      <Button
        title={t(isSelf ? 'valuation.self.submit' : 'inspector.capture.submit')}
        onPress={onSubmit}
        disabled={capture.problems.length > 0}
        loading={submitting}
        style={styles.flex}
      />
    </ButtonRow>
  ) : (
    <ButtonRow>
      <Button
        title={t('inspector.capture.back')}
        variant="outline"
        onPress={() => goTo(step - 1)}
        disabled={step === 0}
        style={styles.flex}
      />
      <Button
        title={step === total - 1 ? t('inspector.capture.review') : t('common.next')}
        onPress={() => goTo(step + 1)}
        style={styles.flex}
      />
    </ButtonRow>
  );

  const vehicle = inspection.vehicle
    ? [inspection.vehicle.make, inspection.vehicle.model, inspection.vehicle.year].filter(Boolean).join(' ')
    : null;

  return (
    <ScreenContainer header={header} footer={footer}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={styles.top}>
          <View style={styles.progressText}>
            <AppText variant="caption" style={styles.flex} numberOfLines={1}>
              {[vehicle, reviewing ? t('inspector.capture.reviewTitle') : item.groupLabel].filter(Boolean).join(' · ')}
            </AppText>
            <AppText variant="caption">
              {reviewing ? `${total}/${total}` : t('inspector.capture.step', { n: step + 1, total })}
            </AppText>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.round(((reviewing ? total : step + 1) / total) * 100)}%` }]} />
          </View>
        </View>

        {reviewing ? (
          <FadeIn key="review">
            <AppText variant="h3" style={styles.reviewTitle}>
              {t('inspector.capture.reviewTitle')}
            </AppText>
            {capture.problems.length ? (
              <InfoNote style={styles.note}>
                {t('inspector.capture.blocked', { count: capture.problems.length })}
              </InfoNote>
            ) : (
              <InfoNote style={styles.note}>{t('inspector.capture.ready')}</InfoNote>
            )}
            <ReviewList
              items={items}
              answers={capture.answers}
              problems={capture.problems}
              evidenceCount={capture.evidenceCount}
              onOpen={scrolled(nav.openFromReview)}
            />
            {submitError ? (
              <AppText variant="caption" color={colors.danger} style={styles.note}>
                {submitError}
              </AppText>
            ) : null}
          </FadeIn>
        ) : (
          <FadeIn key={item.code} offset={ms(8)}>
            {fixing && nav.otherIssues.length ? (
              <InfoNote style={styles.fixingNote}>
                {t('inspector.capture.moreIssues', { count: nav.otherIssues.length })}
              </InfoNote>
            ) : null}
            <CaptureStep
              item={item}
              inspectionId={inspectionId}
              isSelf={isSelf}
              answer={capture.answers[item.code]}
              saveState={capture.saveState[item.code]}
              shotState={capture.shotState}
              onAnswer={(answer, options) => capture.setAnswer(item.code, answer, options)}
              onTakePhoto={capture.takePhoto}
              onPickFile={capture.pickFile}
              identityDraft={capture.identityDrafts[item.code]}
              onIdentityDraft={updater => capture.setIdentityDraft(item.code, updater)}
            />
          </FadeIn>
        )}
      </ScrollView>
      {dialog}
    </ScreenContainer>
  );
}

const BAR = ms(4);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  top: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  progressText: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  track: {
    height: BAR,
    marginTop: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  bar: {
    height: BAR,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  reviewTitle: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  note: {
    marginTop: spacing.md,
  },
  fixingNote: {
    marginBottom: spacing.md,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default Capture;
