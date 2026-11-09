import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, CheckCircle, FillImage } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { scrollToView } from '../../../../utils/scrollToView';
import { useT } from '../../../../i18n';
import { isDocumentItem, isPhotoGridItem, mapAiSeverityToAnswer, newestFindingFor } from '../../../../vendor/selfInspectionLogic';
import { slotKey, uploadKindFor } from '../useSelfInspection';
import { groupName, itemName } from '../labels';
import AiSuggestion from '../components/AiSuggestion';
import EvidenceList from '../components/EvidenceList';
import FactAnswer, { isFactItem } from '../components/FactAnswer';
import ItemAnswer from '../components/ItemAnswer';
import { useInspectorMode } from '../inspectorMode';
import SectionCard from '../components/SectionCard';
import StatusPill from '../components/StatusPill';

// All the questions on one page (the web's checklistStep): the owner's facts first
// (original RC, PUC, flood, keys, servicing and its follow-ups), then the condition
// questions, one card each. Follow-ups join only after their question's matching
// answer. focusItem: scroll to that question (a jump from the "what's left" list).
// Answering a question moves on to the next one by itself.
const ADVANCE_DELAY_MS = 350;
const HIGHLIGHT_MS = 1600;

function ChecklistStep({ si, focusItem, scrollRef, onGoStep, onAddDocument }) {
  const t = useT();
  const inspector = useInspectorMode();
  const questions = si.partition.checklist;
  const sections = [
    {
      key: 'facts',
      // The owner tells us about their vehicle; the officer records it about this one.
      titleKey: inspector ? 'selfInspection.checklist.sectionFactsInspector' : 'selfInspection.checklist.sectionFacts',
      items: questions.filter(q => q.gate === true),
    },
    { key: 'condition', titleKey: 'selfInspection.checklist.sectionCondition', items: questions.filter(q => q.gate !== true) },
  ].filter(s => s.items.length > 0);

  // Bring the asked-for question into view.
  const cards = useRef({});
  useEffect(() => {
    if (!focusItem) return;
    scrollToView(scrollRef, cards.current[focusItem], spacing.lg);
  }, [focusItem, scrollRef]);

  // A question answered for the first time (a tap, or its details saved): a moment
  // later - long enough to see it saved - the page glides on to the next question
  // still open (a follow-up it just opened, or the one after), outlined for a moment
  // so it's clear where to go. Nothing after it: back up to a required one still open.
  const [advanceFrom, setAdvanceFrom] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const onAnswered = useCallback(code => setAdvanceFrom({ code }), []);
  const latest = useRef({ items: [], local: {} });
  useEffect(() => {
    latest.current = { items: sections.flatMap(s => s.items), local: si.local };
  });
  useEffect(() => {
    if (!advanceFrom) return undefined;
    const timer = setTimeout(() => {
      const { items, local } = latest.current;
      const open = q => local[q.item_code]?.saved !== true;
      const from = items.findIndex(q => q.item_code === advanceFrom.code);
      const next = items.slice(from + 1).find(open) ?? items.slice(0, Math.max(from, 0)).find(q => q.mandatory && open(q));
      if (!next) return;
      scrollToView(scrollRef, cards.current[next.item_code], spacing.lg);
      setHighlight(next.item_code);
    }, ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [advanceFrom, scrollRef]);
  useEffect(() => {
    if (!highlight) return undefined;
    const timer = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlight]);

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
        style={[
          styles.question,
          done && styles.questionDone,
          (focusItem === q.item_code || highlight === q.item_code) && styles.questionFocus,
        ]}
      >
        <View style={styles.head}>
          <View style={styles.flex}>
            {group ? <AppText style={styles.group}>{groupName(t, group.group_code, group.label)}</AppText> : null}
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
          {/* Answered: a small green tick (nothing to say while it isn't). */}
          {done ? (
            <View accessibilityLabel={t('selfInspection.status.done')} accessible>
              <CheckCircle size={ms(18)} />
            </View>
          ) : null}
        </View>
        {isPhotoGridItem(q) ? photosSummary(q) : q.evidence_requirement ? singleEvidence(q) : null}
        {q.item_code === 'B1' ? aiSuggestion(q) : null}
        {isFactItem(q) ? (
          <FactAnswer si={si} item={q} onAnswered={onAnswered} />
        ) : isDocumentItem(q) ? null : (
          <ItemAnswer si={si} item={q} onAnswered={onAnswered} />
        )}
      </View>
    );
  };

  return (
    <SectionCard
      plain
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
          <AppText style={styles.sectionTitle}>{t(s.titleKey)}</AppText>
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
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.title.semiBold,
    fontSize: fs(15),
    lineHeight: fs(20),
    color: colors.body,
  },
  question: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  questionDone: {
    borderColor: colors.successLight,
  },
  questionFocus: {
    borderWidth: 1,
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
    fontSize: fs(12),
    lineHeight: fs(16),
    color: colors.placeholder,
  },
  title: {
    marginTop: spacing.xxs,
    fontFamily: fonts.title.semiBold,
    fontSize: fs(16),
    lineHeight: fs(22),
    color: colors.heading,
  },
  required: {
    fontFamily: fonts.title.semiBold,
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
