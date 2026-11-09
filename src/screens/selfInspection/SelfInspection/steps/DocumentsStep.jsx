import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, FadeIn, Icon, IconTile } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
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
// one at a time in one clean card: a text tab per document (ticked when done), the
// current one's title, hint and controls - the RC scan (read by AI, confirmed
// before saving), previous owners, then the papers. Light Previous / Next links,
// and a confirmed scan moves on by itself (the bar below goes on to the Checklist).
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
      {/* One tab per document: the open one underlined in red, a green tick once it's done. */}
      <View style={styles.tabsLine}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {docs.map((d, i) => {
            const isDone = local[d.item_code]?.saved === true;
            const active = i === index;
            return (
              <Pressable
                key={d.item_code}
                onPress={() => setIndex(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                hitSlop={{ top: 4, bottom: 4 }}
                style={[styles.tab, active && styles.tabActive]}
              >
                {isDone ? <Icon name="check" size={ms(12)} color={colors.success} strokeWidth={2.8} /> : null}
                <AppText style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                  {shortName(d)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FadeIn key={code} offset={ms(8)} style={styles.doc}>
        <View style={styles.head}>
          <IconTile
            name={done ? 'check' : DOC_ICONS[code] ?? 'document'}
            size={ms(40)}
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
            <AppText style={styles.title}>{title}</AppText>
          </View>
        </View>
        <AppText variant="caption" style={styles.hint}>
          {hint}
        </AppText>
        {body}
      </FadeIn>

      {/* Between documents: two light links (the bar below goes on to the Checklist). */}
      {index > 0 || !last ? (
        <View style={styles.nav}>
          {index > 0 ? (
            <Button
              title={t('selfInspection.checklist.previous')}
              variant="ghost"
              size="sm"
              fullWidth={false}
              leftIcon={
                <View style={styles.flip}>
                  <Icon name="chevronRight" size={ms(14)} color={colors.primary} strokeWidth={2.4} />
                </View>
              }
              onPress={() => setIndex(index - 1)}
              style={styles.link}
            />
          ) : null}
          {!last ? (
            <Button
              title={t('selfInspection.documents.next')}
              variant="ghost"
              size="sm"
              fullWidth={false}
              rightIcon={<Icon name="chevronRight" size={ms(14)} color={colors.primary} strokeWidth={2.4} />}
              onPress={() => setIndex(index + 1)}
              style={[styles.link, styles.next]}
            />
          ) : null}
        </View>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  // Text tabs on one thin line; the open one sits on it with a red underline.
  tabsLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabs: {
    gap: spacing.lg,
    paddingRight: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(13.5),
    lineHeight: fs(18),
    color: colors.body,
  },
  tabTextActive: {
    fontFamily: fonts.title.semiBold,
    color: colors.primary,
  },
  doc: {
    gap: spacing.md,
    paddingTop: spacing.xs,
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
    marginTop: spacing.xxs,
    fontFamily: fonts.title.semiBold,
    fontSize: fs(17),
    lineHeight: fs(23),
    color: colors.heading,
  },
  hint: {
    marginTop: -spacing.xs,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  link: {
    paddingHorizontal: spacing.xs,
  },
  // Next always on the right, also when there's no Previous.
  next: {
    marginLeft: 'auto',
  },
  flip: {
    transform: [{ rotate: '180deg' }],
  },
});

export default DocumentsStep;
