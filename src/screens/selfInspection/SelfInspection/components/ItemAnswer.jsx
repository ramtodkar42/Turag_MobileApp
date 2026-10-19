import { useT } from '../../../../i18n';
import { blankAnswer } from '../useSelfInspection';
import { itemName } from '../labels';
import AnswerControls from './AnswerControls';

// An item's answer controls wired to saving (the web's answerFor).
function ItemAnswer({ si, item }) {
  const t = useT();
  const code = item.item_code;
  const numeric = item.answer_type === 'NUMERIC';
  return (
    <AnswerControls
      label={itemName(t, item)}
      numeric={numeric}
      numericPlaceholder={
        code === 'O1'
          ? t('selfInspection.answer.kmPlaceholder')
          : code === 'O2'
          ? t('selfInspection.answer.ownersPlaceholder')
          : t('selfInspection.answer.number')
      }
      state={si.local[code] ?? blankAnswer()}
      disabled={si.submitting}
      onSeverity={sev => {
        // Leaving "can't check" on a number clears the answer until a number is
        // typed - it must never save as OK without a value.
        if (numeric && sev === 'OK') {
          si.updateLocal(code, c => ({ ...c, severity: undefined, naReason: '', saved: false }));
          return;
        }
        si.record(code, {
          severity: sev,
          ...(sev !== 'NOT_ASSESSABLE' ? { naReason: '' } : {}),
          ...(sev === 'NOT_ASSESSABLE' && numeric ? { num: '' } : {}),
        });
      }}
      onNaReason={reason => si.record(code, { naReason: reason })}
      onNumChange={value => si.updateLocal(code, c => ({ ...c, num: value, error: undefined }))}
      onNumCommit={() => si.record(code, {})}
      onCostChange={value => si.updateLocal(code, c => ({ ...c, cost: value }))}
      onNoteChange={value => si.updateLocal(code, c => ({ ...c, note: value }))}
      onCommit={() => si.record(code, {})}
    />
  );
}

export default ItemAnswer;
