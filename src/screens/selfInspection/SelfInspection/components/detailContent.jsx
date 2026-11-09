import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, FadeIn, Icon } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { isDocumentItem } from '../../../../vendor/selfInspectionLogic';
import IdentityExtractCard from '../identity/IdentityExtractCard';
import { slotKey, uploadKindFor } from '../useSelfInspection';
import { itemName } from '../labels';
import EvidenceList from './EvidenceList';
import ItemAnswer from './ItemAnswer';
import OdometerScan from './OdometerScan';

// Which scans are open and what was typed in them. Kept by the screen, so moving
// between steps and documents loses nothing.
export const useDetailScans = () => {
  const [open, setOpen] = useState({});
  const [drafts, setDrafts] = useState({});
  return {
    isOpen: code => open[code] === true,
    show: code => setOpen(s => ({ ...s, [code]: true })),
    hide: code => setOpen(s => ({ ...s, [code]: false })),
    draft: code => drafts[code],
    setDraft: (code, update) =>
      setDrafts(d => ({ ...d, [code]: typeof update === 'function' ? update(d[code]) : update })),
  };
};

// The persisted note without its "RC: " prefix, for display (the web's noteBody).
const noteBody = note => note.replace(/^RC:\s*/, '').replace(/\s*\|\s*/g, ' · ');

// A detail or a document (the web's renderDetailItem): { title, hint, body }. RC and
// VIN scans are read by AI and confirmed before saving, the odometer is typed or
// read from a photo, previous owners come from the RC record when it has them, and a
// document's upload is its answer. Shared by the Documents step (RC, owners, papers)
// and the Photos step (odometer, VIN).
export const detailContent = ({ t, si, item, scans, onAddDocument }) => {
  const { local, inspection } = si;
  const code = item.item_code;
  // The inspection officer's doorstep inspection: wording for them, and the RC / VIN
  // questions are graded (OK to critical, or can't check) as on the web - the scan is
  // the evidence beside the grade, not the answer.
  const officer = inspection.mode !== 'M1';
  const forOfficer = key => (officer ? `${key}Inspector` : key);

  // A saved scan with "Change"; otherwise the scan itself.
  const scanBody = (savedText, scan) =>
    local[code]?.saved && savedText && !scans.isOpen(code) ? (
      <View style={styles.saved}>
        <Icon name="check" size={ms(16)} color={colors.success} strokeWidth={2.6} />
        <AppText style={styles.savedText}>{savedText}</AppText>
        <Pressable onPress={() => scans.show(code)} accessibilityRole="button" hitSlop={8}>
          <AppText style={styles.change}>{t('selfInspection.change')}</AppText>
        </Pressable>
      </View>
    ) : (
      scan
    );

  const identity = (kind, confirm) => (
    <IdentityExtractCard
      key={`${code}-${scans.isOpen(code) ? 'open' : 'closed'}`}
      embedded
      inspectionId={inspection.id}
      kind={kind}
      plainNote={inspection.mode === 'M1'}
      disabled={si.submitting}
      onConfirm={async (note, evidence, scanFile) => {
        const ok = await confirm(note, evidence, scanFile);
        if (ok) scans.hide(code);
        return ok;
      }}
      draft={scans.draft(code)}
      onDraft={update => scans.setDraft(code, update)}
    />
  );

  const evidence = () => {
    const kind = uploadKindFor(item);
    const shot = item.evidence_requirement?.shot_codes?.[0] ?? code;
    const key = slotKey(code, shot);
    return (
      <EvidenceList
        isDoc={kind === 'DOCUMENT'}
        files={si.mediaFiles[code] ?? []}
        thumbs={si.thumbs}
        busy={si.uploading[key] === true}
        removing={si.removing[key] === true}
        disabled={si.submitting}
        message={si.slotMsg[key]}
        onAdd={source => onAddDocument(item, shot, kind, source)}
        onRemove={f => si.deleteShot(code, f.shotCode, f.id)}
      />
    );
  };

  // The officer's RC / VIN: the scan (until it's read) with the grade under it. A
  // grade alone answers the question too (a plate that can't be read: can't check).
  const graded = scan => (
    <View style={styles.body}>
      {scan}
      <ItemAnswer si={si} item={item} />
    </View>
  );

  switch (code) {
    case 'P1':
      return {
        title: t('selfInspection.documents.rcTitle'),
        hint: t(forOfficer('selfInspection.documents.rcHint')),
        body: officer
          ? graded(scanBody(local.P1?.note ? noteBody(local.P1.note) : null, identity('RC', si.confirmRc)))
          : scanBody(local.P1?.note ? noteBody(local.P1.note) : t('selfInspection.documents.rcConfirmed'), identity('RC', si.confirmRc)),
      };
    case 'A1':
      return {
        title: t('selfInspection.documents.vinTitle'),
        hint: t(forOfficer('selfInspection.documents.vinHint')),
        body: officer
          ? graded(scanBody(local.A1?.note ? noteBody(local.A1.note) : null, identity('VIN', si.confirmVin)))
          : scanBody(local.A1?.note ? noteBody(local.A1.note) : t('selfInspection.documents.recorded'), identity('VIN', si.confirmVin)),
      };
    case 'O1':
      return {
        title: t('selfInspection.documents.odoTitle'),
        hint: t(forOfficer('selfInspection.documents.odoHint')),
        body: (
          <View style={styles.body}>
            <ItemAnswer si={si} item={item} />
            {scans.isOpen('O1') ? (
              <FadeIn style={styles.scan}>
                <OdometerScan
                  disabled={si.submitting}
                  onConfirmKm={(km, photo) => {
                    scans.hide('O1');
                    si.record('O1', { num: String(km), severity: 'OK', naReason: '' });
                    if (photo) si.keepScanPhoto('O1', photo);
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
                onPress={() => scans.show('O1')}
                style={styles.left}
              />
            ) : null}
          </View>
        ),
      };
    case 'O2':
      return si.registryPrevOwners != null
        ? {
            title: t('selfInspection.documents.ownersTitle'),
            hint: t('selfInspection.documents.ownersRegistryHint'),
            body: (
              <View style={styles.body}>
                <AppText style={styles.savedText}>
                  {t('selfInspection.documents.ownersRegistryValue', { n: si.registryPrevOwners })}
                </AppText>
                {local.O2?.error ? (
                  <AppText variant="caption" color={colors.danger}>
                    {local.O2.error}
                  </AppText>
                ) : null}
              </View>
            ),
          }
        : {
            title: t('selfInspection.documents.ownersTitle'),
            hint: t(forOfficer('selfInspection.documents.ownersHint')),
            body: <ItemAnswer si={si} item={item} />,
          };
    default:
      return {
        title: itemName(t, item),
        hint: isDocumentItem(item) ? t('selfInspection.documents.uploadHint') : t('selfInspection.documents.detailsHint'),
        body: (
          <View style={styles.body}>
            {item.evidence_requirement ? evidence() : null}
            {/* A document is never graded: its upload is the answer. */}
            {isDocumentItem(item) ? null : <ItemAnswer si={si} item={item} />}
          </View>
        ),
      };
  }
};

const styles = StyleSheet.create({
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
});
