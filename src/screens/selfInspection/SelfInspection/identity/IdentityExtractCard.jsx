import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Icon, Spinner } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { verifyInspectionIdentity } from '../../../../api/services/valuation.api';
import useIdentityRead from './useIdentityRead';
import VinForm from './VinForm';
import RcForm from './RcForm';

const COPY = {
  VIN: {
    icon: 'car',
    title: 'inspector.identity.vinTitle',
    description: 'inspector.identity.vinDescription',
    add: 'inspector.identity.addVinPhoto',
    notDocument: 'inspector.identity.notVin',
  },
  RC: {
    icon: 'document',
    title: 'inspector.identity.rcTitle',
    description: 'inspector.identity.rcDescription',
    add: 'inspector.identity.addRcPhoto',
    notDocument: 'inspector.identity.notRc',
  },
};

// Which registry verdicts to show per card, and their field labels.
const VERDICT_FIELDS = {
  VIN: [
    ['vin', 'inspector.identity.vin'],
    ['engine_number', 'inspector.identity.engine'],
  ],
  RC: [
    ['registration_number', 'inspector.identity.registration'],
    ['make', 'inspector.identity.make'],
    ['model', 'inspector.identity.model'],
    ['variant', 'inspector.identity.variant'],
    ['mfg_year', 'inspector.identity.year'],
    ['fuel', 'inspector.identity.fuel'],
  ],
};
const VERDICT_TONE = { MATCH: 'verified', MISMATCH: 'danger' };

// Self-inspection A1 / P1 (as the web's VIN / RC cards): a photo of the VIN
// plate / the RC is read by AI, the user confirms or corrects what it read, and
// only then it's (1) saved as the item's answer with a MASKED note, and (2) the
// confirmed plaintext is checked against the registry baseline (identity-verify)
// to show per-field verdicts. Typing it in works too.
// kind: 'VIN' | 'RC'. onConfirm(note, evidence) saves the item; resolves true once saved.
// draft / onDraft keep the read + typed details alive across step navigation.
function IdentityExtractCard({ inspectionId, kind, disabled, onConfirm, draft, onDraft, embedded = false, style }) {
  const t = useT();
  const copy = COPY[kind];
  const photo = useIdentityRead(inspectionId, kind, {
    initial: draft?.readState,
    onChange: readState => onDraft?.(d => ({ ...(d ?? {}), readState })),
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'saved' | 'failed'
  const [formKey, setFormKey] = useState(0);

  // Registry verdicts (display-only; never persisted). A generation counter
  // drops a stale response if the user re-reads before it returns.
  const verifyRun = useRef(0);
  const [verifying, setVerifying] = useState(false);
  const [verdicts, setVerdicts] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  const clearVerify = () => {
    verifyRun.current += 1;
    setVerifying(false);
    setVerdicts(null);
    setVerifyError('');
  };

  const restart = action => () => {
    setStatus(null);
    clearVerify();
    setFormKey(key => key + 1);
    onDraft?.(d => ({ ...(d ?? {}), formState: null }));
    action();
  };

  const runVerify = async evidence => {
    const id = ++verifyRun.current;
    setVerifying(true);
    setVerdicts(null);
    setVerifyError('');
    try {
      const result = await verifyInspectionIdentity(inspectionId, evidence);
      if (id === verifyRun.current) setVerdicts(result);
    } catch {
      if (id === verifyRun.current) setVerifyError(t('inspector.identity.verifyUnavailable'));
    } finally {
      if (id === verifyRun.current) setVerifying(false);
    }
  };

  // Confirm → save the masked note on the item, then check the confirmed
  // plaintext against the registry baseline.
  const save = async (note, evidence) => {
    setSaving(true);
    setStatus(null);
    // The confirmed plaintext goes along too (the self-inspection's live estimate uses it).
    const ok = await onConfirm(note, evidence);
    setSaving(false);
    setStatus(ok ? 'saved' : 'failed');
    if (ok && evidence) {
      runVerify(evidence);
    }
  };

  const formProps = {
    read: photo.read,
    fromPhoto: photo.fromPhoto,
    disabled,
    saving,
    onSave: save,
    onRetake: restart(photo.reset),
    draft: draft?.formState,
    onDraftChange: formState => onDraft?.(d => ({ ...(d ?? {}), formState })),
  };
  const Form = kind === 'VIN' ? VinForm : RcForm;
  const showForm = photo.phase === 'ready' && (kind === 'VIN' || photo.read);

  return (
    // embedded: inside a host that shows its own title (self-inspection) - no
    // card chrome or header of its own.
    <View style={[embedded ? styles.embedded : styles.card, style]}>
      {!embedded ? (
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Icon name={copy.icon} size={ms(20)} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <AppText variant="title" style={styles.title}>
              {t(copy.title)}
            </AppText>
            <AppText variant="caption">{t(copy.description)}</AppText>
          </View>
          <Badge label={t('inspector.identity.aiBadge')} tone="danger" size="sm" />
        </View>
      ) : null}

      {photo.error ? (
        <AppText variant="caption" color={colors.danger} style={styles.section}>
          {photo.error}
        </AppText>
      ) : null}
      {photo.notDocument ? (
        <View style={[styles.notice, styles.section]}>
          <AppText variant="caption" color={colors.heading}>
            {t(copy.notDocument)}
          </AppText>
        </View>
      ) : null}

      {photo.phase === 'reading' ? (
        <View style={[styles.reading, styles.section]}>
          <Spinner size={ms(22)} />
          <AppText variant="label">{t('inspector.identity.reading')}</AppText>
        </View>
      ) : showForm ? (
        <View style={styles.section}>
          <Form key={formKey} {...formProps} />
        </View>
      ) : (
        <View style={[styles.startButtons, styles.section]}>
          <Button
            title={t(photo.notDocument ? 'inspector.identity.retake' : copy.add)}
            leftIcon={<Icon name="image" size={ms(18)} color={colors.white} />}
            onPress={restart(photo.choosePhoto)}
            disabled={disabled}
          />
          <Button
            title={t('inspector.identity.enterManually')}
            variant="outline"
            leftIcon={<Icon name="pencil" size={ms(18)} color={colors.primary} />}
            onPress={restart(photo.startManual)}
            disabled={disabled}
          />
        </View>
      )}

      {status ? (
        <View style={[styles.status, styles.section]}>
          {status === 'saved' ? (
            <Icon name="check" size={ms(16)} color={colors.success} strokeWidth={2.5} />
          ) : null}
          <AppText variant="caption" color={status === 'saved' ? colors.success : colors.danger}>
            {t(status === 'saved' ? 'inspector.identity.saved' : 'inspector.capture.saveError')}
          </AppText>
        </View>
      ) : null}

      {/* Registry baseline check (verdicts only). */}
      {verifying ? (
        <View style={[styles.reading, styles.section]}>
          <Spinner size={ms(18)} />
          <AppText variant="caption">{t('inspector.identity.verifying')}</AppText>
        </View>
      ) : verifyError ? (
        <AppText variant="caption" color={colors.muted} style={styles.section}>
          {verifyError}
        </AppText>
      ) : verdicts ? (
        <View style={[styles.verdicts, styles.section]}>
          <AppText variant="caption" color={colors.heading} style={styles.verdictTitle}>
            {t('inspector.identity.verifyTitle')}
          </AppText>
          {verdicts.has_baseline ? (
            (VERDICT_FIELDS[kind] ?? []).map(([key, labelKey]) => (
              <View key={key} style={styles.verdictRow}>
                <AppText variant="caption" style={styles.verdictLabel}>
                  {t(labelKey)}
                </AppText>
                <Badge
                  label={t(`inspector.identity.verdict.${verdicts[key] ?? 'NOT_AVAILABLE'}`)}
                  tone={VERDICT_TONE[verdicts[key]] ?? 'neutral'}
                  size="sm"
                />
              </View>
            ))
          ) : (
            <AppText variant="caption">{t('inspector.identity.noBaseline')}</AppText>
          )}
        </View>
      ) : null}
    </View>
  );
}

const ICON_WRAP = ms(40);

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  // Each section has a top margin; the host already spaces the first one.
  embedded: {
    marginTop: -spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrap: {
    width: ICON_WRAP,
    height: ICON_WRAP,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  section: {
    marginTop: spacing.md,
  },
  notice: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  startButtons: {
    gap: spacing.sm,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  verdicts: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  verdictTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  verdictLabel: {
    flex: 1,
  },
});

export default IdentityExtractCard;
