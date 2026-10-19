import { useCallback, useEffect, useRef, useState } from 'react';
import { readPref, removePref, writePref } from '../../../utils/appPrefs';

const stepKey = inspectionId => `capture.step.${inspectionId}`;

// Forgets where an inspection was left (after it's submitted).
export const forgetCaptureStep = inspectionId => removePref(stepKey(inspectionId));

// Where the inspector is in the capture wizard. Steps 0..total-1 are the
// checklist items; `total` is Review.
// - Reopening an inspection continues at the step it was left on (saved on
//   the device per inspection), not at step 1.
// - Opening an item from Review is "fixing" mode: its buttons go back to
//   Review or on to the next item that still needs attention, and Back
//   returns to Review instead of the previous step.
// back() handles a back press and returns false when it should leave the
// screen (the first step, outside fixing mode).
export default function useCaptureNav({ inspectionId, total, problems }) {
  const [step, setStep] = useState(0);
  const [fixing, setFixing] = useState(false);
  const [saved, setSaved] = useState(undefined); // undefined until read, null = none
  const restored = useRef(false);

  useEffect(() => {
    let active = true;
    readPref(stepKey(inspectionId)).then(value => {
      if (active) {
        const n = value == null ? NaN : Number(value);
        setSaved(Number.isInteger(n) && n >= 0 ? n : null);
      }
    });
    return () => {
      active = false;
    };
  }, [inspectionId]);

  // Once the checklist is loaded, continue where it was left off.
  useEffect(() => {
    if (!restored.current && saved !== undefined && total > 0) {
      restored.current = true;
      setStep(Math.min(saved ?? 0, total));
    }
  }, [saved, total]);

  const goTo = useCallback(
    index => {
      setStep(index);
      writePref(stepKey(inspectionId), index);
    },
    [inspectionId],
  );

  const openFromReview = useCallback(
    index => {
      setFixing(true);
      goTo(index);
    },
    [goTo],
  );

  const backToReview = useCallback(() => {
    setFixing(false);
    goTo(total);
  }, [goTo, total]);

  // Items still needing attention, other than the one on screen.
  const otherIssues = problems.filter(p => p.index !== step);

  // The next item that needs attention after this one (wrapping round).
  const nextIssue = useCallback(() => {
    const target = otherIssues.find(p => p.index > step) ?? otherIssues[0];
    if (target) {
      goTo(target.index);
    } else {
      backToReview();
    }
  }, [otherIssues, step, goTo, backToReview]);

  const back = useCallback(() => {
    if (fixing) {
      backToReview();
      return true;
    }
    if (step > 0) {
      goTo(step - 1);
      return true;
    }
    return false;
  }, [fixing, step, goTo, backToReview]);

  return {
    ready: saved !== undefined,
    step,
    reviewing: total > 0 && step >= total,
    fixing,
    otherIssues,
    goTo,
    openFromReview,
    backToReview,
    nextIssue,
    back,
  };
}
