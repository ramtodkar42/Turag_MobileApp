import { useT } from '../../../../i18n';
import { blankAnswer } from '../useSelfInspection';
import { itemName } from '../labels';
import { useInspectorMode } from '../inspectorMode';
import AnswerControls from './AnswerControls';

// Answers complete with the tap itself: nothing more to type (worse ones ask for the
// repair cost or a note; "can't check" for its reason).
const ONE_TAP = new Set(['OK', 'MINOR']);

// An item's answer controls wired to saving (the web's answerFor).
// The inspection officer grades the number items that count towards the grade
// (tyre tread can be worn), as the web's inspector capture; the owner just types
// the number. Odometer and previous owners don't count (scored: false), so they
// stay a number.
// onAnswered(code): the question got its first complete answer (one tap, or the
// reason it can't be checked) and it saved - the page can move on.
function ItemAnswer({ si, item, onAnswered }) {
  const t = useT();
  const inspector = useInspectorMode();
  const code = item.item_code;
  const numeric = item.answer_type === 'NUMERIC';
  const graded = numeric && inspector && item.scored !== false;
  const state = si.local[code] ?? blankAnswer();

  const save = async (patch, complete) => {
    const first = state.saved !== true;
    const ok = await si.record(code, patch);
    if (ok && first && complete) onAnswered?.(code);
  };

  return (
    <AnswerControls
      label={itemName(t, item)}
      numeric={numeric}
      graded={graded}
      numericPlaceholder={
        code === 'O1'
          ? t('selfInspection.answer.kmPlaceholder')
          : code === 'O2'
          ? t('selfInspection.answer.ownersPlaceholder')
          : t('selfInspection.answer.number')
      }
      state={state}
      disabled={si.submitting}
      onSeverity={sev => {
        // Leaving "can't check" on a number clears the answer until a number is
        // typed - it must never save as OK without a value. (A graded number's
        // choices are real grades, saved as they are.)
        if (numeric && !graded && sev === 'OK') {
          si.updateLocal(code, c => ({ ...c, severity: undefined, naReason: '', saved: false }));
          return;
        }
        save(
          {
            severity: sev,
            ...(sev !== 'NOT_ASSESSABLE' ? { naReason: '' } : {}),
            ...(sev === 'NOT_ASSESSABLE' && numeric ? { num: '' } : {}),
          },
          !numeric && ONE_TAP.has(sev),
        );
      }}
      onNaReason={reason => save({ naReason: reason }, true)}
      // Typed values save by themselves a moment after typing stops (and on blur).
      onNumChange={value => si.typeAnswer(code, { num: value })}
      onNumCommit={() => si.record(code, {})}
      onCostChange={value => si.typeAnswer(code, { cost: value })}
      onNoteChange={value => si.typeAnswer(code, { note: value })}
      onCommit={() => si.record(code, {})}
    />
  );
}

export default ItemAnswer;
