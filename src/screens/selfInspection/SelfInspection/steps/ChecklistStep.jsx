import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, FadeIn, FillImage } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { isPhotoGridItem, mapAiSeverityToAnswer, newestFindingFor } from '../../../../vendor/selfInspectionLogic';
import { slotKey, uploadKindFor } from '../useSelfInspection';
import { groupName, itemName } from '../labels';
import AiSuggestion from '../components/AiSuggestion';
import EvidenceList from '../components/EvidenceList';
import ItemAnswer from '../components/ItemAnswer';
import SectionCard from '../components/SectionCard';
import StatusPill from '../components/StatusPill';

// The condition questions, one per screen (the web's checklistStep):
// "Question n of N", numbered dots to jump (green when answered), the group
// and question, its photos (the body-panel walkaround links to Photos), the
// AI suggestion on the body-panel question, the answer, Previous / Next.
function ChecklistStep({ si, qIndex, onQuestion, onGoStep, onAddDocument }) {
  const t = useT();
  const questions = si.partition.checklist;
  const qi = Math.min(Math.max(qIndex, 0), Math.max(questions.length - 1, 0));
  const q = questions[qi];
  const group = q ? si.sections.find(s => s.items.some(x => x.item_code === q.item_code)) : null;

  const photosSummary = () => {
    const shots = q.evidence_requirement?.shot_codes ?? [];
    const files = si.mediaFiles[q.item_code] ?? [];
    const have = (si.mediaShots[q.item_code] ?? []).filter(s => shots.includes(s)).length;
    return (
      <View style={styles.photos}>
        <View style={styles.stack}>
          {files.slice(0, 6).map((f, i) =>
            si.thumbs[f.id] ? (
              <View key={f.id} style={[styles.stackThumb, i > 0 && styles.overlap]}>
                <FillImage source={{ uri: si.thumbs[f.id] }} />
              </View>
            ) : null,
          )}
        </View>
        <AppText variant="caption">{t('selfInspection.checklist.photos', { done: have, total: shots.length })}</AppText>
        <Pressable onPress={() => onGoStep('photos')} accessibilityRole="button">
          <AppText style={styles.link}>{t('selfInspection.checklist.editPhotos')}</AppText>
        </Pressable>
      </View>
    );
  };

  const singleEvidence = () => {
    const kind = uploadKindFor(q);
    const shot = q.evidence_requirement?.shot_codes?.[0] ?? q.item_code;
    const key = slotKey(q.item_code, shot);
    return (
      <EvidenceList
        isDoc={kind === 'DOCUMENT'}
        files={si.mediaFiles[q.item_code] ?? []}
        thumbs={si.thumbs}
        busy={si.uploading[key] === true}
        removing={si.removing[key] === true}
        disabled={si.submitting}
        message={si.slotMsg[key]}
        onAdd={source => onAddDocument(q, shot, kind, source)}
        onRemove={f => si.deleteShot(q.item_code, f.shotCode, f.id)}
      />
    );
  };

  const aiSuggestion = () => {
    const entry = newestFindingFor(si.persisted, q.evidence_requirement?.shot_codes ?? []);
    if (!entry) return null;
    const aiAnswer = mapAiSeverityToAnswer(entry.finding.has_damage ? entry.finding.severity : 'NONE');
    const aiCost =
      entry.finding.has_damage && entry.finding.repair_cost_minor > 0
        ? String(Math.round(entry.finding.repair_cost_minor / 100))
        : '';
    return (
      <AiSuggestion
        finding={entry.finding}
        verdict={si.aiVerdictSaved.B1 ?? null}
        disabled={si.submitting || si.local.B1?.saving === true}
        onConfirm={() => si.record('B1', { severity: aiAnswer, cost: aiCost }, { finding: entry.finding, mediaId: entry.mediaId })}
        onReject={() =>
          si.record('B1', { severity: 'OK', cost: '' }, { finding: entry.finding, mediaId: entry.mediaId, forcedVerdict: 'REJECTED' })
        }
      />
    );
  };

  return (
    <SectionCard>
      <View style={styles.top}>
        <AppText style={styles.counter}>
          {t('selfInspection.checklist.question', { n: questions.length === 0 ? 0 : qi + 1, total: questions.length })}
        </AppText>
        <StatusPill
          done={si.progress.checklist.done >= si.progress.checklist.total}
          doneText={t('selfInspection.checklist.allAnswered')}
          todoText={t('selfInspection.checklist.progress', { done: si.progress.checklist.done, total: si.progress.checklist.total })}
        />
      </View>
      <View style={styles.dots}>
        {questions.map((item, i) => {
          const answered = si.local[item.item_code]?.saved;
          return (
            <Pressable
              key={item.item_code}
              onPress={() => onQuestion(i)}
              accessibilityRole="button"
              accessibilityLabel={t('selfInspection.checklist.jump', { n: i + 1, name: itemName(t, item) })}
              accessibilityState={{ selected: i === qi }}
              style={[styles.dot, answered && styles.dotDone, i === qi && styles.dotCurrent]}
            >
              <AppText style={[styles.dotText, (answered || i === qi) && styles.dotTextOn]}>{i + 1}</AppText>
            </Pressable>
          );
        })}
      </View>

      {q ? (
        <FadeIn key={q.item_code} offset={ms(8)} style={styles.question}>
          <View>
            <AppText style={styles.group}>{group ? groupName(t, group.group_code, group.label) : ''}</AppText>
            <AppText variant="h3" style={styles.title}>
              {itemName(t, q)}
              {q.mandatory ? <AppText variant="h3" color={colors.primary}>{' *'}</AppText> : null}
            </AppText>
            {q.dynamic ? (
              <AppText variant="caption" style={styles.dynamic}>
                {t('selfInspection.checklist.dynamic')}
              </AppText>
            ) : null}
          </View>
          {isPhotoGridItem(q) ? photosSummary() : q.evidence_requirement ? singleEvidence() : null}
          {q.item_code === 'B1' ? aiSuggestion() : null}
          <ItemAnswer si={si} item={q} />
          <ButtonRow style={styles.nav}>
            <Button
              title={t('selfInspection.checklist.previous')}
              variant="outline"
              size="md"
              fullWidth={false}
              disabled={qi === 0}
              onPress={() => onQuestion(qi - 1)}
              style={styles.flex}
            />
            {qi < questions.length - 1 ? (
              <Button title={t('selfInspection.checklist.next')} size="md" fullWidth={false} onPress={() => onQuestion(qi + 1)} style={styles.flex} />
            ) : (
              <Button title={t('selfInspection.checklist.seeEstimate')} size="md" fullWidth={false} onPress={() => onGoStep('review')} style={styles.flex} />
            )}
          </ButtonRow>
        </FadeIn>
      ) : (
        <AppText variant="subtitle">{t('selfInspection.checklist.none')}</AppText>
      )}
    </SectionCard>
  );
}

const DOT = ms(32);
const THUMB = ms(38);

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  counter: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(12.5),
    lineHeight: fs(17),
    color: colors.body,
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dotDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  dotCurrent: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary,
  },
  dotText: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(12),
    lineHeight: fs(16),
    color: colors.body,
  },
  dotTextOn: {
    color: colors.white,
  },
  question: {
    gap: spacing.lg,
  },
  group: {
    fontFamily: fonts.title.bold,
    fontSize: fs(11.5),
    lineHeight: fs(15),
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  title: {
    marginTop: spacing.xs,
    fontSize: fs(21),
    lineHeight: fs(27),
  },
  dynamic: {
    marginTop: spacing.xs,
  },
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stack: {
    flexDirection: 'row',
  },
  stackThumb: {
    width: THUMB,
    height: THUMB,
    overflow: 'hidden',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.input,
  },
  overlap: {
    marginLeft: -ms(10),
  },
  link: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(13.5),
    lineHeight: fs(18),
    color: colors.primary,
  },
  nav: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
});

export default ChecklistStep;
