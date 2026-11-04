import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, FadeIn, Icon, IconTile } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { itemName } from '../labels';
import { DETAIL_ITEM_CODES } from '../constants';
import { detailContent } from '../components/detailContent';
import SectionCard from '../components/SectionCard';
import StatusPill from '../components/StatusPill';

// Icon per document: RC, VIN, odometer, owners; papers get the document icon.
const DOC_ICONS = { P1: 'document', O2: 'user' };
// Scans confirmed in one tap move on to the next document by themselves.
const AUTO_NEXT = new Set(['P1']);
const NEXT_DELAY_MS = 700;

// Documents & details (the same items and rules as the web's Documents step),
// one at a time in one clean card: a pill per document (ticked when done), the
// current one's title, hint and controls - the RC scan (read by AI, confirmed
// before saving), previous owners, then the papers. Previous / Next, and a
// confirmed scan moves on by itself.
// docIndex / onDocIndex: the open document (kept by the screen so the phone's
// back button can step back through them); null = the first one still to do.
function DocumentsStep({ si, docIndex, onDocIndex, focusItem, scans, onAddDocument, onGoStep }) {
  const t = useT();
  const { partition, progress, local } = si;
  const docs = partition.documents;
  const firstOpen = docs.findIndex(d => !local[d.item_code]?.saved);
  const index = docIndex ?? (firstOpen >= 0 ? firstOpen : 0);
  const setIndex = onDocIndex;
  const doc = docs[Math.min(index, Math.max(docs.length - 1, 0))];
  const code = doc?.item_code;

  // Jump from the "what's left" list.
  useEffect(() => {
    if (!focusItem) return;
    const i = docs.findIndex(d => d.item_code === focusItem);
    if (i >= 0) setIndex(i);
  }, [focusItem, docs, setIndex]);

  // A confirmed RC / VIN / odometer scan moves on to the next open document.
  const wasSaved = useRef(!!local[code]?.saved);
  useEffect(() => {
    const saved = !!local[code]?.saved;
    const justSaved = saved && !wasSaved.current;
    wasSaved.current = saved;
    if (!justSaved || !AUTO_NEXT.has(code)) return undefined;
    const timer = setTimeout(() => {
      const next = docs.findIndex((d, i) => i > index && !local[d.item_code]?.saved);
      if (next >= 0) setIndex(next);
    }, NEXT_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local[code]?.saved, code]);
  useEffect(() => {
    wasSaved.current = !!local[code]?.saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (!doc) {
    return (
      <SectionCard title={t('selfInspection.documents.title')}>
        <AppText variant="subtitle">{t('selfInspection.documents.none')}</AppText>
      </SectionCard>
    );
  }

  const shortName = d => {
    const key = `selfInspection.docShort.${d.item_code}`;
    const value = t(key);
    return value === key ? itemName(t, d) : value;
  };

  const { title, hint, body } = detailContent({ t, si, item: doc, scans, onAddDocument });
  const done = local[code]?.saved === true;
  const optional = !doc.mandatory && !DETAIL_ITEM_CODES.includes(code);
  const last = index >= docs.length - 1;

  return (
    <SectionCard
      title={t('selfInspection.documents.title')}
      subtitle={t('selfInspection.documents.subtitle')}
      right={
        <StatusPill
          done={progress.documents.done >= progress.documents.total}
          doneText={t('selfInspection.documents.allDone')}
          todoText={t('selfInspection.documents.progress', { done: progress.documents.done, total: progress.documents.total })}
        />
      }
    >
      {/* One pill per document */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {docs.map((d, i) => {
          const isDone = local[d.item_code]?.saved === true;
          const active = i === index;
          return (
            <Pressable
              key={d.item_code}
              onPress={() => setIndex(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.pill, isDone && styles.pillDone, active && styles.pillActive]}
            >
              {isDone && !active ? <Icon name="check" size={ms(12)} color={colors.success} strokeWidth={2.8} /> : null}
              <AppText style={[styles.pillText, isDone && styles.pillTextDone, active && styles.pillTextActive]} numberOfLines={1}>
                {shortName(d)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <FadeIn key={code} offset={ms(8)} style={styles.doc}>
        <View style={styles.head}>
          <IconTile
            name={done ? 'check' : DOC_ICONS[code] ?? 'document'}
            size={ms(44)}
            color={done ? colors.success : colors.primary}
            backgroundColor={done ? colors.successLight : colors.dangerLight}
          />
          <View style={styles.flex}>
            <AppText variant="caption">
              {t('selfInspection.documents.position', { n: index + 1, total: docs.length })}
              {optional ? (
                <AppText variant="caption" color={colors.placeholder}>{` · ${t('selfInspection.optional')}`}</AppText>
              ) : null}
            </AppText>
            <AppText variant="h3" style={styles.title}>
              {title}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" style={styles.hint}>
          {hint}
        </AppText>
        {body}
      </FadeIn>

      <ButtonRow style={styles.nav}>
        <Button
          title={t('selfInspection.checklist.previous')}
          variant="outline"
          size="md"
          fullWidth={false}
          disabled={index === 0}
          onPress={() => setIndex(index - 1)}
          style={styles.flex}
        />
        <Button
          title={last ? t('selfInspection.next', { step: t('selfInspection.step.checklist') }) : t('selfInspection.documents.next')}
          size="md"
          fullWidth={false}
          onPress={() => (last ? onGoStep('checklist') : setIndex(index + 1))}
          style={styles.flex}
        />
      </ButtonRow>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  pills: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: ms(36),
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pillDone: {
    borderColor: colors.successLight,
    backgroundColor: colors.successLight,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.dangerLight,
  },
  pillText: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(13),
    lineHeight: fs(18),
    color: colors.body,
  },
  pillTextDone: {
    color: colors.success,
  },
  pillTextActive: {
    color: colors.primary,
  },
  doc: {
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  title: {
    fontSize: fs(19),
    lineHeight: fs(25),
  },
  hint: {
    marginTop: -spacing.xs,
  },
  nav: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

export default DocumentsStep;
