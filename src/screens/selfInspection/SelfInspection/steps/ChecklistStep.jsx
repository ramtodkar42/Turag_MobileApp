import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, FillImage } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { isDocumentItem, isPhotoGridItem, mapAiSeverityToAnswer, newestFindingFor } from '../../../../vendor/selfInspectionLogic';
import { slotKey, uploadKindFor } from '../useSelfInspection';
import { groupName, itemName } from '../labels';
import AiSuggestion from '../components/AiSuggestion';
import EvidenceList from '../components/EvidenceList';
import FactAnswer, { isFactItem } from '../components/FactAnswer';
import ItemAnswer from '../components/ItemAnswer';
import SectionCard from '../components/SectionCard';
import StatusPill from '../components/StatusPill';

// All the questions on one page (the web's checklistStep): the owner's facts first
// (original RC, PUC, flood, keys, servicing and its follow-ups), then the condition
// questions, one card each. Follow-ups join only after their question's matching
// answer. focusItem: scroll to that question (a jump from the "what's left" list).
function ChecklistStep({ si, focusItem, scrollRef, onGoStep, onAddDocument }) {
  const t = useT();
  const questions = si.partition.checklist;
  const sections = [
    { key: 'facts', titleKey: 'selfInspection.checklist.sectionFacts', items: questions.filter(q => q.gate === true) },
    { key: 'condition', titleKey: 'selfInspection.checklist.sectionCondition', items: questions.filter(q => q.gate !== true) },
  ].filter(s => s.items.length > 0);

  // Bring the asked-for question into view.
  const cards = useRef({});
  useEffect(() => {
    if (!focusItem) return;
    const card = cards.current[focusItem];
    const list = scrollRef?.current;
    const host = list?.getInnerViewNode?.() ?? list?.getNativeScrollRef?.();
    if (card?.measureLayout && host) {
      card.measureLayout(host, (_x, y) => list.scrollTo({ y: Math.max(0, y - spacing.lg), animated: true }), () => {});
    }
  }, [focusItem, scrollRef]);

  const photosSummary = q => {
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

  const singleEvidence = q => {
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

  const aiSuggestion = q => {
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

  const question = q => {
    const done = si.local[q.item_code]?.saved === true;
    const group = si.sections.find(s => s.items.some(x => x.item_code === q.item_code));
    return (
      <View
        key={q.item_code}
        ref={node => {
          cards.current[q.item_code] = node;
        }}
        collapsable={false}
        style={[styles.question, done && styles.questionDone, focusItem === q.item_code && styles.questionFocus]}
      >
        <View style={styles.head}>
          <View style={styles.flex}>
            <AppText style={styles.group}>{group ? groupName(t, group.group_code, group.label) : ''}</AppText>
            <AppText style={styles.title}>
              {itemName(t, q)}
              {q.mandatory ? <AppText style={styles.required}>{' *'}</AppText> : null}
            </AppText>
            {q.dynamic ? (
              <AppText variant="caption" style={styles.dynamic}>
                {t('selfInspection.checklist.dynamic')}
              </AppText>
            ) : null}
          </View>
          <StatusPill done={done} />
        </View>
        {isPhotoGridItem(q) ? photosSummary(q) : q.evidence_requirement ? singleEvidence(q) : null}
        {q.item_code === 'B1' ? aiSuggestion(q) : null}
        {isFactItem(q) ? <FactAnswer si={si} item={q} /> : isDocumentItem(q) ? null : <ItemAnswer si={si} item={q} />}
      </View>
    );
  };

  return (
    <SectionCard
      title={t('selfInspection.step.checklist')}
      subtitle={t('selfInspection.checklist.pageSubtitle')}
      right={
        <StatusPill
          done={si.progress.checklist.done >= si.progress.checklist.total}
          doneText={t('selfInspection.checklist.allAnswered')}
          todoText={t('selfInspection.checklist.progress', { done: si.progress.checklist.done, total: si.progress.checklist.total })}
        />
      }
    >
      {sections.map(s => (
        <View key={s.key} style={styles.section}>
          <AppText variant="h3" style={styles.sectionTitle}>
            {t(s.titleKey)}
          </AppText>
          {s.items.map(question)}
        </View>
      ))}
      {questions.length === 0 ? <AppText variant="subtitle">{t('selfInspection.checklist.none')}</AppText> : null}
    </SectionCard>
  );
}

const THUMB = ms(38);

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fs(17),
    lineHeight: fs(23),
  },
  question: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  questionDone: {
    borderColor: colors.successLight,
  },
  questionFocus: {
    borderColor: colors.primary,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  group: {
    fontFamily: fonts.title.bold,
    fontSize: fs(11),
    lineHeight: fs(15),
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  title: {
    marginTop: spacing.xxs,
    fontFamily: fonts.title.bold,
    fontSize: fs(16),
    lineHeight: fs(22),
    color: colors.heading,
  },
  required: {
    fontFamily: fonts.title.bold,
    color: colors.primary,
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
});

export default ChecklistStep;
