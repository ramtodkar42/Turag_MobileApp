import { StyleSheet, View } from 'react-native';
import { AppText, Badge } from '../../../../components';
import { spacing } from '../../../../theme';
import { useT } from '../../../../i18n';
import SectionCard from './SectionCard';

const TONES = { EXCELLENT: 'success', GOOD: 'success', FAIR: 'warning', POOR: 'danger' };

// An inspector's inspection: the visual condition worked out from the AI photo readings
// and the answers (the web's condition panel). It adjusts the final value.
// condition: { level, unknowns } from the shared rule.
function ConditionSummary({ condition }) {
  const t = useT();
  const unknown = condition.unknowns.length;
  return (
    <SectionCard
      title={t('selfInspection.inspector.condition')}
      right={<Badge label={t(`selfInspection.condition.${condition.level}`)} tone={TONES[condition.level] ?? 'neutral'} />}
    >
      <View style={styles.notes}>
        {unknown > 0 ? (
          <AppText variant="caption">{t('selfInspection.inspector.conditionUnknown', { count: unknown })}</AppText>
        ) : null}
        <AppText variant="caption">{t('selfInspection.inspector.conditionNote')}</AppText>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  notes: {
    gap: spacing.xxs,
  },
});

export default ConditionSummary;
