import { Badge, Icon } from '../../../../components';
import { colors } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// "Done" (green, with a tick) or "To do" (grey) - the app's Badge. Texts can be overridden.
function StatusPill({ done, doneText, todoText, style }) {
  const t = useT();
  return (
    <Badge
      size="sm"
      tone={done ? 'success' : 'neutral'}
      label={done ? doneText ?? t('selfInspection.status.done') : todoText ?? t('selfInspection.status.todo')}
      icon={done ? <Icon name="check" size={ms(11)} color={colors.success} strokeWidth={2.8} /> : null}
      style={style}
    />
  );
}

export default StatusPill;
