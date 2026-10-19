import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, ChoiceChip, OptionSheet, TextField } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatNumber } from '../../../../utils/format';
import { useT } from '../../../../i18n';
import useReplaceConfirm from '../../../../hooks/useReplaceConfirm';
import useDocumentSource from '../useDocumentSource';
import {
  BOOL_OPTIONS,
  COSTED,
  NA_REASONS,
  SHOT_LABEL_KEYS,
  STATE_OPTIONS,
  shotFallback,
} from '../../constants';
import ShotRow from './ShotRow';
import IdentityExtractCard from '../identity/IdentityExtractCard';

const IDENTITY_KINDS = { A1: 'VIN', P1: 'RC' };

const digits = text => text.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

// One checklist item (as the web's wizard step): what to check, its answer -
//   STATE: OK / Minor / Moderate / Major / Critical / N/A
//   BOOL:  Yes / No / N/A
//   NUMERIC: a number (plus how bad, when it's scored - e.g. tyre tread)
// N/A asks why. Moderate or worse can carry an estimated repair cost; there's
// an optional note; and the photos / documents the item needs.
// onAnswer(answer, { persist }) - chips save at once; typed fields save when done.
function CaptureStep({
  item,
  inspectionId,
  isSelf,
  answer = {},
  saveState,
  shotState,
  onAnswer,
  onTakePhoto,
  onPickFile,
  identityDraft,
  onIdentityDraft,
}) {
  const t = useT();
  const [naOpen, setNaOpen] = useState(false);
  const { askReplace, dialog: replaceDialog } = useReplaceConfirm();
  const { chooseSource, sheet: sourceSheet } = useDocumentSource();
  const severity = answer.severity ?? null;
  const numeric = item.answerType === 'NUMERIC';
  const options = item.answerType === 'BOOL' ? BOOL_OPTIONS : STATE_OPTIONS;
  // Unscored numbers (odometer) just carry "OK" with the value.
  const showSeverity = !numeric || item.scored;

  const change = (patch, persist = true) => onAnswer({ ...answer, ...patch }, { persist });

  const pickSeverity = value => {
    if (value === 'NOT_ASSESSABLE') {
      change({ severity: value }, false);
      setNaOpen(true);
      return;
    }
    change({ severity: value, naReason: null, refurbCost: COSTED.has(value) ? answer.refurbCost : null });
  };

  // Self-inspection A1 / P1: the VIN / RC photo read. A confirmed read is saved
  // as OK with a MASKED note (as the web) - the plaintext reads are never
  // persisted; they only go to identity-verify for the registry check.
  const identityKind = isSelf ? IDENTITY_KINDS[item.code] : null;
  const confirmIdentity = note =>
    onAnswer(
      {
        ...answer,
        severity: 'OK',
        naReason: null,
        refurbCost: null,
        note,
      },
      { persist: true },
    );

  const shotTitle = code => (SHOT_LABEL_KEYS[code] ? t(SHOT_LABEL_KEYS[code]) : shotFallback(code));

  // A shot that already has a file is replaced: ask first.
  const kind = item.evidence?.kind === 'DOCUMENT' ? 'document' : 'photo';
  const replaceable = (code, action) => () =>
    shotState(item.code, code).done ? askReplace(kind, action) : action();

  let saveText = null;
  if (saveState === 'saving') {
    saveText = t('inspector.capture.saving');
  } else if (saveState === 'saved') {
    saveText = t('inspector.capture.saved');
  } else if (saveState) {
    saveText = saveState; // the error
  }

  return (
    <View>
      <View style={styles.titleRow}>
        <AppText variant="h3" style={styles.title}>
          {item.label}
        </AppText>
        {item.mandatory ? <Badge label={t('inspector.capture.required')} tone="danger" size="sm" /> : null}
      </View>

      {numeric ? (
        <TextField
          label={t(item.code === 'O1' ? 'inspector.capture.odometer' : 'inspector.capture.value')}
          placeholder={t('inspector.capture.valuePlaceholder')}
          value={answer.numericValue != null ? formatNumber(String(answer.numericValue)) : ''}
          onChangeText={text => {
            const value = digits(text);
            change(
              {
                numericValue: value === '' ? null : Number(value),
                severity: item.scored ? severity : value === '' ? null : 'OK',
              },
              false,
            );
          }}
          onBlur={() => onAnswer(answer, { persist: true })}
          keyboardType="number-pad"
          returnKeyType="done"
          style={styles.section}
        />
      ) : null}

      {showSeverity ? (
        <View style={[styles.chips, styles.section]}>
          {options.map(option => (
            <ChoiceChip
              key={option.value}
              label={t(option.labelKey)}
              selected={severity === option.value}
              onPress={() => pickSeverity(option.value)}
              style={styles.chip}
            />
          ))}
        </View>
      ) : null}

      {severity === 'NOT_ASSESSABLE' ? (
        <Pressable onPress={() => setNaOpen(true)} accessibilityRole="button" style={styles.section}>
          <AppText variant="label" color={answer.naReason ? colors.heading : colors.danger}>
            {answer.naReason
              ? t('inspector.capture.naReasonPicked', { reason: t(`inspector.na.${answer.naReason}`) })
              : t('inspector.capture.naReasonNeeded')}
          </AppText>
        </Pressable>
      ) : null}

      {COSTED.has(severity) ? (
        <TextField
          label={t('inspector.capture.cost')}
          optional
          placeholder={t('inspector.capture.costPlaceholder')}
          value={answer.refurbCost != null ? formatNumber(String(answer.refurbCost)) : ''}
          onChangeText={text => {
            const value = digits(text);
            change({ refurbCost: value === '' ? null : Number(value) }, false);
          }}
          onBlur={() => onAnswer(answer, { persist: true })}
          left={
            <AppText variant="body" color={colors.heading}>
              ₹
            </AppText>
          }
          keyboardType="number-pad"
          style={styles.section}
        />
      ) : null}
      {item.escalates && severity === 'CRITICAL' ? (
        <AppText variant="caption" style={styles.hint}>
          {t('inspector.capture.criticalNote')}
        </AppText>
      ) : null}

      {/* Identity steps (A1/P1) manage their own masked note, so no free note here. */}
      {identityKind ? null : (
        <TextField
          label={t('inspector.capture.note')}
          optional
          multiline
          placeholder={t('inspector.capture.notePlaceholder')}
          value={answer.note ?? ''}
          onChangeText={text => change({ note: text }, false)}
          onBlur={() => onAnswer(answer, { persist: true })}
          maxLength={1000}
          style={styles.section}
        />
      )}

      {identityKind ? (
        <IdentityExtractCard
          key={item.code}
          inspectionId={inspectionId}
          kind={identityKind}
          onConfirm={confirmIdentity}
          draft={identityDraft}
          onDraft={onIdentityDraft}
          style={styles.section}
        />
      ) : null}

      {item.evidence ? (
        <View style={styles.section}>
          <AppText variant="title" style={styles.evidenceTitle}>
            {t(item.evidence.kind === 'DOCUMENT' ? 'inspector.capture.documents' : 'inspector.capture.photos')}
          </AppText>
          <AppText variant="caption">
            {item.evidence.allShots
              ? t('inspector.capture.evidenceAll', { count: item.evidence.minCount })
              : item.evidence.minCount > 0
              ? t('inspector.capture.evidenceNeeded', { count: item.evidence.minCount })
              : t('inspector.capture.evidenceOptional')}
          </AppText>
          <View style={styles.shots}>
            {item.evidence.shotCodes.map(code => (
              <ShotRow
                key={code}
                title={shotTitle(code)}
                state={shotState(item.code, code)}
                document={item.evidence.kind === 'DOCUMENT'}
                onCamera={replaceable(code, () => onTakePhoto(item, code, shotTitle(code)))}
                onGallery={replaceable(code, () =>
                  chooseSource(source => onPickFile(item, code, source)),
                )}
              />
            ))}
          </View>
          {replaceDialog}
          {sourceSheet}
        </View>
      ) : null}

      {saveText ? (
        <AppText
          variant="caption"
          color={saveState === 'saving' || saveState === 'saved' ? colors.success : colors.danger}
          style={styles.section}
        >
          {saveText}
        </AppText>
      ) : null}

      <OptionSheet
        visible={naOpen}
        title={t('inspector.capture.naTitle')}
        options={NA_REASONS.map(reason => ({ label: t(`inspector.na.${reason}`), value: reason }))}
        value={answer.naReason}
        onSelect={reason => change({ severity: 'NOT_ASSESSABLE', naReason: reason, refurbCost: null })}
        onClose={() => setNaOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  section: {
    marginTop: spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minWidth: '30%',
    flexGrow: 1,
  },
  hint: {
    marginTop: spacing.xs,
  },
  evidenceTitle: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  shots: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});

export default CaptureStep;
