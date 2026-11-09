import { StyleSheet, View } from 'react-native';
import { AppText, CheckCircle } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Where something stands, said quietly: a small green tick + "Done" (green), or just
// the words (e.g. "8 of 19 answered", "Saving…"). Texts can be overridden.
function StatusPill({ done, doneText, todoText, style }) {
  const t = useT();
  const text = done ? doneText ?? t('selfInspection.status.done') : todoText ?? t('selfInspection.status.todo');
  return (
    <View style={[styles.row, style]}>
      {done ? <CheckCircle size={ms(14)} /> : null}
      <AppText variant="caption" color={done ? colors.success : colors.body} numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
});

export default StatusPill;
