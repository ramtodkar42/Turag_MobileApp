import { StyleSheet, View } from 'react-native';
import { AppText, ChoiceChip, IconTile } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { formatINR } from '../../../../utils/format';
import StatusPill from './StatusPill';

// What the AI saw in the walkaround photos, on the body-panel question (the
// web's AiSuggestion): agree or say there's no damage - or just pick an answer.
function AiSuggestion({ finding, verdict, disabled, onConfirm, onReject }) {
  const t = useT();
  if (verdict) {
    return <StatusPill done doneText={t('selfInspection.ai.verdictSaved')} />;
  }
  const part = finding.panel ? finding.panel.replace(/_/g, ' ').toLowerCase() : t('selfInspection.ai.theBody');
  const cost = finding.has_damage && finding.repair_cost_minor > 0 ? formatINR(Math.round(finding.repair_cost_minor / 100)) : null;
  const type = String(finding.damage_type ?? '').replace(/_/g, ' ').toLowerCase();
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <IconTile name="flash" size={ms(32)} />
        <AppText variant="body" style={styles.text}>
          <AppText variant="body" style={styles.bold}>
            {t('selfInspection.ai.lookedAt')}{' '}
          </AppText>
          {finding.has_damage
            ? cost
              ? t('selfInspection.ai.possibleCost', { type, part, cost })
              : t('selfInspection.ai.possible', { type, part })
            : t('selfInspection.ai.none')}{' '}
          {t('selfInspection.ai.right')}
        </AppText>
      </View>
      <View style={styles.row}>
        <ChoiceChip
          label={t(finding.has_damage ? 'selfInspection.ai.yesRight' : 'selfInspection.ai.yesNone')}
          onPress={disabled ? undefined : onConfirm}
          style={styles.flex}
        />
        {finding.has_damage ? (
          <ChoiceChip label={t('selfInspection.ai.noDamageReally')} onPress={disabled ? undefined : onReject} style={styles.flex} />
        ) : null}
      </View>
      <AppText variant="caption">{t('selfInspection.ai.yoursCounts')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.unreadTint,
    borderWidth: 1,
    borderColor: colors.dangerLight,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: fs(14),
    lineHeight: fs(21),
    color: colors.heading,
  },
  bold: {
    fontFamily: fonts.title.bold,
    fontSize: fs(14),
    lineHeight: fs(21),
    color: colors.heading,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});

export default AiSuggestion;
