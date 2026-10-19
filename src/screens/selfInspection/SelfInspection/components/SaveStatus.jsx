import { AppText } from '../../../../components';
import { colors } from '../../../../theme';
import { useT } from '../../../../i18n';
import StatusPill from './StatusPill';

// An answer's save state: the error, "Saving...", or "Saved".
function SaveStatus({ state }) {
  const t = useT();
  if (state.error) {
    return (
      <AppText variant="caption" color={colors.danger}>
        {state.error}
      </AppText>
    );
  }
  if (state.saving) {
    return <StatusPill done={false} todoText={t('selfInspection.status.saving')} />;
  }
  if (state.saved) {
    return <StatusPill done doneText={t('selfInspection.status.saved')} />;
  }
  return null;
}

export default SaveStatus;
