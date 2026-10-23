import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, FadeIn, Icon, IconTile } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { isDocumentItem } from '../../../../vendor/selfInspectionLogic';
import IdentityExtractCard from '../identity/IdentityExtractCard';
import { slotKey, uploadKindFor } from '../useSelfInspection';
import { itemName } from '../labels';
import { DETAIL_ITEM_CODES } from '../constants';
import EvidenceList from '../components/EvidenceList';
import ItemAnswer from '../components/ItemAnswer';
import OdometerScan from '../components/OdometerScan';
import SectionCard from '../components/SectionCard';
import StatusPill from '../components/StatusPill';

// Icon per document: RC, VIN, odometer, owners; papers get the document icon.
const DOC_ICONS = { P1: 'document', A1: 'car', O1: 'timer', O2: 'user' };
// Scans confirmed in one tap move on to the next document by themselves.
const AUTO_NEXT = new Set(['P1', 'A1', 'O1']);
const NEXT_DELAY_MS = 700;

// The persisted note without its "RC: " prefix, for display (the web's noteBody).
const noteBody = note => note.replace(/^RC:\s*/, '').replace(/\s*\|\s*/g, ' · ');

// Documents & details (the same items and rules as the web's Documents step),
// one at a time in one clean card: a pill per document (ticked when done), the
// current one's title, hint and controls - RC and VIN scans (read by AI,
// confirmed before saving), the odometer (typed or read from a photo),
// previous owners, then the papers. Previous / Next, and a confirmed scan
// moves on by itself.
// docIndex / onDocIndex: the open document (kept by the screen so the phone's
// back button can step back through them); null = the first one still to do.
function DocumentsStep({ si, docIndex, onDocIndex, focusItem, onAddDocument, onGoStep }) {
  const t = useT();
  const { partition, progress, local, inspection } = si;
  const docs = partition.documents;
  const [scanOpen, setScanOpen] = useState({});
  const [drafts, setDrafts] = useState({});
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

  const closeScan = c => setScanOpen(s => ({ ...s, [c]: false }));
  const openScan = c => setScanOpen(s => ({ ...s, [c]: true }));
  const shortName = d => {
    const key = `selfInspection.docShort.${d.item_code}`;
    const value = t(key);
    return value === key ? itemName(t, d) : value;
  };

  // A saved scan with "Change"; otherwise the scan itself.
  const scanBody = (c, savedText, scan) =>
    local[c]?.saved && savedText && !scanOpen[c] ? (
      <View style={styles.saved}>
        <Icon name="check" size={ms(16)} color={colors.success} strokeWidth={2.6} />
        <AppText style={styles.savedText}>{savedText}</AppText>
        <Pressable onPress={() => openScan(c)} accessibilityRole="button" hitSlop={8}>
          <AppText style={styles.change}>{t('selfInspection.change')}</AppText>
        </Pressable>
      </View>
    ) : (
      scan
    );

  const identity = (c, kind, confirm) => (
    <IdentityExtractCard
      key={`${c}-${scanOpen[c] ? 'open' : 'closed'}`}
      embedded
      inspectionId={inspection.id}
      kind={kind}
      disabled={si.submitting}
      onConfirm={async (note, evidence) => {
        const ok = await confirm(note, evidence);
        if (ok) closeScan(c);
        return ok;
      }}
      draft={drafts[c]}
      onDraft={update => setDrafts(d => ({ ...d, [c]: typeof update === 'function' ? update(d[c]) : update }))}
    />
  );

  const evidence = item => {
    const kind = uploadKindFor(item);
    const shot = item.evidence_requirement?.shot_codes?.[0] ?? item.item_code;
    const key = slotKey(item.item_code, shot);
    return (
      <EvidenceList
        isDoc={kind === 'DOCUMENT'}
        files={si.mediaFiles[item.item_code] ?? []}
        thumbs={si.thumbs}
        busy={si.uploading[key] === true}
        removing={si.removing[key] === true}
        disabled={si.submitting}
        message={si.slotMsg[key]}
        onAdd={source => onAddDocument(item, shot, kind, source)}
        onRemove={f => si.deleteShot(item.item_code, f.shotCode, f.id)}
      />
    );
  };

  // Title, hint and controls of the current document.
  const content = () => {
    switch (code) {
      case 'P1':
        return {
          title: t('selfInspection.documents.rcTitle'),
          hint: t('selfInspection.documents.rcHint'),
          body: scanBody('P1', local.P1?.note ? noteBody(local.P1.note) : t('selfInspection.documents.rcConfirmed'), identity('P1', 'RC', si.confirmRc)),
        };
      case 'A1':
        return {
          title: t('selfInspection.documents.vinTitle'),
          hint: t('selfInspection.documents.vinHint'),
          body: scanBody('A1', local.A1?.note ? noteBody(local.A1.note) : t('selfInspection.documents.recorded'), identity('A1', 'VIN', si.confirmVin)),
        };
      case 'O1':
        return {
          title: t('selfInspection.documents.odoTitle'),
          hint: t('selfInspection.documents.odoHint'),
          body: (
            <View style={styles.body}>
              <ItemAnswer si={si} item={doc} />
              {scanOpen.O1 ? (
                <FadeIn style={styles.scan}>
                  <OdometerScan
                    disabled={si.submitting}
                    onConfirmKm={km => {
                      closeScan('O1');
                      si.record('O1', { num: String(km), severity: 'OK', naReason: '' });
                    }}
                  />
                </FadeIn>
              ) : local.O1?.severity !== 'NOT_ASSESSABLE' ? (
                <Button
                  title={t('selfInspection.documents.readFromPhoto')}
                  size="sm"
                  variant="outline"
                  fullWidth={false}
                  leftIcon={<Icon name="camera" size={ms(14)} color={colors.primary} />}
                  onPress={() => openScan('O1')}
                  style={styles.left}
                />
              ) : null}
            </View>
          ),
        };
      case 'O2':
        return {
          title: t('selfInspection.documents.ownersTitle'),
          hint: t('selfInspection.documents.ownersHint'),
          body: <ItemAnswer si={si} item={doc} />,
        };
      default:
        return {
          title: itemName(t, doc),
          hint: isDocumentItem(doc) ? t('selfInspection.documents.uploadHint') : t('selfInspection.documents.detailsHint'),
          body: (
            <View style={styles.body}>
              {doc.evidence_requirement ? evidence(doc) : null}
              <ItemAnswer si={si} item={doc} />
            </View>
          ),
        };
    }
  };

  const { title, hint, body } = content();
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
  body: {
    gap: spacing.md,
  },
  scan: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  left: {
    alignSelf: 'flex-start',
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
  },
  savedText: {
    flex: 1,
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(14),
    lineHeight: fs(20),
    color: colors.heading,
  },
  change: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(13.5),
    lineHeight: fs(18),
    color: colors.primary,
  },
  nav: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

export default DocumentsStep;
