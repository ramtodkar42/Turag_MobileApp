import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button } from '../../../../components';
import { spacing } from '../../../../theme';
import { useT } from '../../../../i18n';
import { applyOcr, confirmOcr, editOcr, isOcrDone, typeOcr } from './ocrConfirm';
import { formatMaskedVinNote, vinEvidence } from './identityNote';
import OcrField from './OcrField';

const valueOf = state => (state.status === 'CONFIRMED' ? state.detected : state.value).trim();

// A1 (as the web's VIN card): the VIN and the engine number - each confirmed
// or typed. The engine number may be "not visible" (only the VIN is saved).
// read: the AI's read ({} / null when typing it in). onSave(note) saves A1.
// draft restores what was entered when the step is reopened; onDraftChange
// reports edits up so the wizard keeps that draft across Next / Back.
function VinForm({ read, fromPhoto, disabled, saving, onSave, onRetake, draft, onDraftChange }) {
  const t = useT();
  const [vin, setVin] = useState(() => draft?.vin ?? applyOcr(read?.vin));
  const [engine, setEngine] = useState(() => draft?.engine ?? applyOcr(read?.engineNumber));
  const [engineHidden, setEngineHidden] = useState(() => draft?.engineHidden ?? false);

  // Keep the wizard's draft in step with what's on screen (survives Next/Back).
  const report = useRef(onDraftChange);
  report.current = onDraftChange;
  useEffect(() => {
    report.current?.({ vin, engine, engineHidden });
  }, [vin, engine, engineHidden]);

  const canSave = isOcrDone(vin) && (engineHidden || isOcrDone(engine));
  // Save a MASKED note on the item; send the confirmed plaintext to verify.
  const save = () => {
    const vinVal = valueOf(vin);
    const engineVal = engineHidden ? null : valueOf(engine);
    onSave(formatMaskedVinNote(!!engineVal), vinEvidence(vinVal, engineVal));
  };

  return (
    <View style={styles.form}>
      <OcrField
        label={t('inspector.identity.vin')}
        state={vin}
        fromPhoto={fromPhoto}
        disabled={disabled}
        onYes={() => setVin(confirmOcr)}
        onEdit={() => setVin(editOcr)}
        onChange={value => setVin(prev => typeOcr(prev, value))}
      />
      {engineHidden ? (
        <AppText variant="caption">{t('inspector.identity.engineSkipped')}</AppText>
      ) : (
        <OcrField
          label={t('inspector.identity.engine')}
          state={engine}
          fromPhoto={fromPhoto}
          disabled={disabled}
          onYes={() => setEngine(confirmOcr)}
          onEdit={() => setEngine(editOcr)}
          onChange={value => setEngine(prev => typeOcr(prev, value))}
        />
      )}

      <Button
        title={t('inspector.identity.confirmSave')}
        onPress={save}
        disabled={disabled || !canSave}
        loading={saving}
      />
      <View style={styles.row}>
        <Button
          title={t(engineHidden ? 'inspector.identity.engineVisible' : 'inspector.identity.engineNotVisible')}
          size="sm"
          variant="outline"
          onPress={() => setEngineHidden(hidden => !hidden)}
          disabled={disabled}
          style={styles.flex}
        />
        <Button
          title={t('inspector.identity.retake')}
          size="sm"
          variant="outline"
          onPress={onRetake}
          disabled={disabled || saving}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});

export default VinForm;
