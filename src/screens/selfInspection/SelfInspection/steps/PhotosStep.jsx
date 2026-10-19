import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, FadeIn, FillImage, Icon, Spinner } from '../../../../components';
import { colors, fonts, radius, shadows, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { isVideoItem } from '../../../../vendor/selfInspectionLogic';
import { slotKey } from '../useSelfInspection';
import { itemName, shotName } from '../labels';
import SectionCard from '../components/SectionCard';
import StatusPill from '../components/StatusPill';
import VideoSlot from '../components/VideoSlot';

const TIP_KEYS = ['distance', 'centered', 'lighting', 'steady', 'betterLight'];

// Short group names for the pills (B1 = the exterior walkaround).
const GROUP_KEY = code => {
  const base = code.replace(/_M\d$/, '');
  return ['B1', 'XINT', 'XENG', 'XTYRE', 'XEXTRA', 'XDENT', 'XVID'].includes(base) ? `selfInspection.photoGroup.${base}` : null;
};

// AI badge for a walkaround photo (the web's aiBadge).
const aiBadge = (state, finding) => {
  if (state === 'pending' || state === 'saving') return { key: 'selfInspection.ai.checking', bg: colors.input, fg: colors.body };
  if (state === 'saved' && finding) {
    return finding.has_damage
      ? { key: 'selfInspection.ai.damage', bg: colors.warningLight, fg: colors.warning }
      : { key: 'selfInspection.ai.noDamage', bg: colors.successLight, fg: colors.success };
  }
  if (state === 'failed') return { key: 'selfInspection.ai.unavailable', bg: colors.input, fg: colors.body };
  return null;
};

// Photos, one at a time (the same photos and rules as the web's Photos step):
// the groups as pills (Exterior, Interior, Engine, Tyres, Video, Extras, Dents
// - required first), one large card for the current angle with "Take photo",
// then on to the next one by itself. A strip of the group's angles to jump
// around; dents grow one at a time.
// focusItem: open the group of that item (a jump from the "what's left" list).
function PhotosStep({ si, focusItem, onTakePhoto, onAddVideo }) {
  const t = useT();
  const { groups, progress, mediaShots, mediaFiles, thumbs, uploading, removing, slotMsg, analysis, persisted, submitting } = si;
  const [tipsOpen, setTipsOpen] = useState(false);
  const [revealedDents, setRevealedDents] = useState(1);

  const has = (s) => (mediaShots[s.itemCode] ?? []).includes(s.shotCode);
  const isDents = g => g.slots.length > 0 && g.slots.every(s => s.shotCode.startsWith('DENT_'));

  // Required groups, the video, then optional groups (the web's order).
  const sections = useMemo(() => {
    const videos = si.allItems.filter(isVideoItem);
    return [
      ...groups.filter(g => g.minCount > 0).map(g => ({ key: g.item.item_code, group: g })),
      ...videos.map(item => ({ key: item.item_code, video: item })),
      ...groups.filter(g => g.minCount === 0).map(g => ({ key: g.item.item_code, group: g })),
    ];
  }, [groups, si.allItems]);

  const sectionDone = sec => {
    if (sec.video) {
      const shot = sec.video.evidence_requirement?.shot_codes?.[0] ?? 'VIDEO';
      return (mediaShots[sec.video.item_code] ?? []).includes(shot);
    }
    const captured = sec.group.slots.filter(has).length;
    return sec.group.minCount > 0 ? captured >= sec.group.minCount : captured > 0;
  };

  // Start on the first required group that's missing something.
  const firstOpen = () => {
    const i = sections.findIndex(sec => sec.group && sec.group.minCount > 0 && !sectionDone(sec));
    return i >= 0 ? i : 0;
  };
  const [secIndex, setSecIndex] = useState(firstOpen);
  const sec = sections[Math.min(secIndex, sections.length - 1)];
  const group = sec?.group;

  // Visible slots of the group (dents: the taken ones + one more).
  const slots = useMemo(() => {
    if (!group) return [];
    if (!isDents(group)) return group.slots;
    const taken = group.slots.filter(has).length;
    return group.slots.slice(0, Math.min(Math.max(taken + 1, revealedDents), group.slots.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, mediaShots, revealedDents]);

  const firstMissing = list => {
    const i = list.findIndex(s => !has(s));
    return i >= 0 ? i : 0;
  };
  const [shotIndex, setShotIndex] = useState(() => firstMissing(slots));
  const slot = slots[Math.min(shotIndex, Math.max(slots.length - 1, 0))];

  const openSection = i => {
    setSecIndex(i);
    const next = sections[i]?.group;
    // Dents are filled in order, so their first missing one is the next to add.
    setShotIndex(next ? firstMissing(next.slots) : 0);
  };

  // Opened from the "what's left" list: show that item's group.
  useEffect(() => {
    if (!focusItem) return;
    const i = sections.findIndex(s => s.key === focusItem);
    if (i >= 0) openSection(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusItem]);

  // After a photo finishes uploading for the current angle, go on to the next
  // missing one in the group by itself.
  const key = slot ? slotKey(slot.itemCode, slot.shotCode) : null;
  const wasUploading = useRef(false);
  useEffect(() => {
    const now = key ? uploading[key] === true : false;
    if (wasUploading.current && !now && slot && has(slot)) {
      const after = slots.findIndex((s, i) => i > shotIndex && !has(s));
      const before = slots.findIndex(s => !has(s));
      const next = after >= 0 ? after : before;
      if (next >= 0) setShotIndex(next);
    }
    wasUploading.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, uploading[key], mediaShots]);

  if (!sec) {
    return <SectionCard title={t('selfInspection.step.photos')} subtitle={t('selfInspection.photos.subtitleEmpty')} />;
  }

  const groupLabel = s => {
    const code = s.video ? s.video.item_code : s.group.item.item_code;
    const k = GROUP_KEY(code);
    return k ? t(k) : itemName(t, s.video ?? s.group.item);
  };
  const groupCount = s => {
    if (s.video) return null;
    const taken = s.group.slots.filter(has).length;
    return s.group.minCount > 0 ? `${Math.min(taken, s.group.minCount)}/${s.group.minCount}` : taken > 0 ? `${taken}` : null;
  };

  // --- Current photo -----------------------------------------------------------
  const photoCard = () => {
    const files = (mediaFiles[slot.itemCode] ?? []).filter(f => f.shotCode === slot.shotCode);
    const photo = files[files.length - 1] ?? null;
    const busy = uploading[key] === true || removing[key] === true;
    const label = shotName(t, slot.shotCode);
    const badge = photo && slot.itemCode === 'B1' ? aiBadge(analysis[slot.shotCode], persisted[slot.shotCode]?.finding) : null;
    const msg = slotMsg[key];
    const index = slots.indexOf(slot);
    const nextIndex = slots.findIndex((s, i) => i > index && !has(s));
    const groupComplete = sectionDone(sec);
    const nextSection = sections.findIndex((s, i) => i > secIndex && !sectionDone(s));

    return (
      <FadeIn key={key} offset={ms(8)} style={styles.focus}>
        <View style={styles.focusHead}>
          <AppText variant="caption">
            {t('selfInspection.photos.position', { n: index + 1, total: isDents(group) ? group.slots.length : slots.length })}
            {' · '}
            <AppText variant="caption" color={slot.optional ? colors.placeholder : colors.primary}>
              {t(slot.optional ? 'selfInspection.optional' : 'selfInspection.photos.required')}
            </AppText>
          </AppText>
          {badge ? (
            <View style={[styles.aiPill, { backgroundColor: badge.bg }]}>
              <AppText style={[styles.aiText, { color: badge.fg }]}>{t(badge.key)}</AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="h3" style={styles.angle}>
          {label}
        </AppText>

        <Pressable
          onPress={() => onTakePhoto(slot.itemCode, slot.shotCode, label, photo != null)}
          disabled={submitting || busy}
          accessibilityRole="button"
          accessibilityLabel={t(photo ? 'selfInspection.photo.retake' : 'selfInspection.photo.add', { label })}
          style={({ pressed }) => [styles.frame, photo && styles.frameFilled, pressed && !photo && styles.framePressed]}
        >
          {photo && thumbs[photo.id] ? <FillImage source={{ uri: thumbs[photo.id] }} /> : null}
          {photo && !busy ? (
            <View style={styles.check}>
              <Icon name="check" size={ms(14)} color={colors.white} strokeWidth={3} />
            </View>
          ) : null}
          {!photo && !busy ? (
            <View style={styles.empty}>
              <View style={styles.bubble}>
                <Icon name="camera" size={ms(28)} color={colors.primary} />
              </View>
              <AppText variant="label" color={colors.heading}>
                {t('selfInspection.photos.tapToTake')}
              </AppText>
              <AppText variant="caption" align="center">
                {t('selfInspection.photos.frameHint')}
              </AppText>
            </View>
          ) : null}
          {busy ? (
            <View style={styles.veil}>
              <Spinner size={ms(36)} />
              <AppText variant="label" color={colors.body}>
                {t(removing[key] ? 'selfInspection.photo.removing' : 'selfInspection.uploading')}
              </AppText>
            </View>
          ) : null}
        </Pressable>

        {msg ? (
          <AppText variant="caption" color={msg.kind === 'error' ? colors.danger : colors.warning}>
            {msg.text}
          </AppText>
        ) : null}

        {photo ? (
          <>
            <ButtonRow>
              <Button
                title={t('selfInspection.retake')}
                variant="outline"
                size="md"
                fullWidth={false}
                disabled={submitting || busy}
                leftIcon={<Icon name="camera" size={ms(15)} color={colors.primary} />}
                onPress={() => onTakePhoto(slot.itemCode, slot.shotCode, label, true)}
                style={styles.flex}
              />
              <Button
                title={t('selfInspection.photos.remove')}
                variant="outline"
                size="md"
                fullWidth={false}
                disabled={submitting || busy}
                leftIcon={<Icon name="trash" size={ms(15)} color={colors.primary} />}
                onPress={() => si.deleteShot(slot.itemCode, slot.shotCode)}
                style={styles.flex}
              />
            </ButtonRow>
            {nextIndex >= 0 ? (
              <Button title={t('selfInspection.photos.nextPhoto')} disabled={busy} onPress={() => setShotIndex(nextIndex)} />
            ) : groupComplete && nextSection >= 0 ? (
              <Button
                title={t('selfInspection.photos.nextGroup', { name: groupLabel(sections[nextSection]) })}
                disabled={busy}
                onPress={() => openSection(nextSection)}
              />
            ) : null}
          </>
        ) : (
          <>
            <Button
              title={t('selfInspection.photos.take')}
              disabled={submitting || busy}
              leftIcon={<Icon name="camera" size={ms(18)} color={colors.white} />}
              onPress={() => onTakePhoto(slot.itemCode, slot.shotCode, label, false)}
            />
            {slot.optional && nextIndex >= 0 ? (
              <Button title={t('selfInspection.photos.skip')} variant="ghost" size="md" onPress={() => setShotIndex(nextIndex)} />
            ) : null}
          </>
        )}

        {isDents(group) && slots.length < group.slots.length && slots.every(has) ? (
          <Button
            title={t('selfInspection.photos.addDent')}
            variant="ghost"
            size="md"
            leftIcon={<Icon name="plus" size={ms(15)} color={colors.primary} />}
            onPress={() => {
              setRevealedDents(n => Math.min(Math.max(n, slots.length) + 1, group.slots.length));
              setShotIndex(slots.length);
            }}
          />
        ) : null}
      </FadeIn>
    );
  };

  // --- Thumbnail strip of the group's angles ------------------------------------
  const strip = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {slots.map((s, i) => {
        const files = (mediaFiles[s.itemCode] ?? []).filter(f => f.shotCode === s.shotCode);
        const photo = files[files.length - 1] ?? null;
        const current = s === slot;
        return (
          <Pressable
            key={s.shotCode}
            onPress={() => setShotIndex(i)}
            accessibilityRole="button"
            accessibilityLabel={shotName(t, s.shotCode)}
            accessibilityState={{ selected: current }}
            style={[styles.thumb, photo && styles.thumbDone, current && styles.thumbCurrent]}
          >
            {photo && thumbs[photo.id] ? (
              <FillImage source={{ uri: thumbs[photo.id] }} />
            ) : (
              <AppText style={[styles.thumbNum, current && { color: colors.primary }]}>{i + 1}</AppText>
            )}
            {photo ? (
              <View style={styles.thumbCheck}>
                <Icon name="check" size={ms(8)} color={colors.white} strokeWidth={3.5} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <SectionCard
      title={t('selfInspection.step.photos')}
      subtitle={t('selfInspection.photos.subtitleOne')}
      right={
        progress.photos.total > 0 ? (
          <StatusPill
            done={progress.photos.done >= progress.photos.total}
            doneText={t('selfInspection.photos.allAdded')}
            todoText={t('selfInspection.photos.progress', { done: progress.photos.done, total: progress.photos.total })}
          />
        ) : null
      }
    >
      {/* Groups */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {sections.map((s, i) => {
          const done = sectionDone(s);
          const active = i === secIndex;
          const count = groupCount(s);
          const optional = s.video
            ? (s.video.evidence_requirement?.min_count ?? 0) === 0
            : s.group.minCount === 0;
          return (
            <Pressable
              key={s.key}
              onPress={() => openSection(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.pill, done && styles.pillDone, active && styles.pillActive]}
            >
              {done && !active ? <Icon name="check" size={ms(12)} color={colors.success} strokeWidth={2.8} /> : null}
              <AppText style={[styles.pillText, done && styles.pillTextDone, active && styles.pillTextActive]} numberOfLines={1}>
                {groupLabel(s)}
                {count ? `  ${count}` : optional ? `  · ${t('selfInspection.optional')}` : ''}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {sec.video ? (
        <FadeIn key={sec.key} offset={ms(8)} style={styles.focus}>
          <AppText variant="h3" style={styles.angle}>
            {itemName(t, sec.video)}
          </AppText>
          <AppText variant="caption">{t('selfInspection.video.hint')}</AppText>
          {(() => {
            const shot = sec.video.evidence_requirement?.shot_codes?.[0] ?? 'VIDEO';
            const vkey = slotKey(sec.video.item_code, shot);
            const have = (mediaShots[sec.video.item_code] ?? []).includes(shot);
            return (
              <VideoSlot
                have={have}
                busy={uploading[vkey] === true}
                disabled={submitting}
                message={slotMsg[vkey]}
                onAdd={source => onAddVideo(sec.video, shot, have, source)}
              />
            );
          })()}
        </FadeIn>
      ) : slot ? (
        <>
          {photoCard()}
          {strip()}
        </>
      ) : null}

      <Pressable onPress={() => setTipsOpen(o => !o)} accessibilityRole="button" style={styles.tipsHead}>
        <View style={styles.tipsTitle}>
          <Icon name="flash" size={ms(14)} color={colors.primary} />
          <AppText variant="label" color={colors.heading}>
            {t('selfInspection.photos.tips')}
          </AppText>
        </View>
        <Icon name="chevronDown" size={ms(14)} color={colors.body} />
      </Pressable>
      {tipsOpen ? (
        <FadeIn style={styles.tips}>
          {TIP_KEYS.map(k => (
            <AppText key={k} variant="caption">{`•  ${t(`selfInspection.tip.${k}`)}`}</AppText>
          ))}
        </FadeIn>
      ) : null}
    </SectionCard>
  );
}

const THUMB = ms(48);

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
  focus: {
    gap: spacing.md,
  },
  focusHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  angle: {
    marginTop: -spacing.xs,
    fontSize: fs(20),
    lineHeight: fs(26),
  },
  aiPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: ms(2),
    borderRadius: radius.pill,
  },
  aiText: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(11),
    lineHeight: fs(15),
  },
  frame: {
    aspectRatio: 4 / 3,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.unreadTint,
  },
  frameFilled: {
    borderStyle: 'solid',
    borderWidth: 0,
    backgroundColor: colors.input,
    ...shadows.sm,
  },
  framePressed: {
    backgroundColor: colors.dangerLight,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
  },
  bubble: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  check: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  veil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  flex: {
    flex: 1,
  },
  strip: {
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
  },
  thumbDone: {
    borderColor: colors.success,
  },
  thumbCurrent: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  thumbNum: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(13),
    lineHeight: fs(18),
    color: colors.placeholder,
  },
  thumbCheck: {
    position: 'absolute',
    right: ms(3),
    bottom: ms(3),
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  tipsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tipsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tips: {
    gap: spacing.xs,
  },
});

export default PhotosStep;
