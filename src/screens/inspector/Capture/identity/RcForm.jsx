import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, KeyValueRow, TextField } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { useT } from '../../../../i18n';
import { RC_FIELDS, formatMaskedRcNote, hasRcDetails, rcEvidence, rcFromRead } from './identityNote';

// P1 (as the web's RC card): the vehicle details read from the RC, shown for
// checking - Confirm & save, or Edit to correct them. Typing them in (no
// photo) starts in edit mode. Owner details are never read or saved.
// draft restores what was entered when the step is reopened; onDraftChange
// reports edits up so the wizard keeps that draft across Next / Back.
function RcForm({ read, fromPhoto, disabled, saving, onSave, onRetake, draft, onDraftChange }) {
  const t = useT();
  const [fields, setFields] = useState(() => draft?.fields ?? rcFromRead(read));
  const [editing, setEditing] = useState(() => draft?.editing ?? !fromPhoto);

  // Keep the wizard's draft in step with what's on screen (survives Next/Back).
  const report = useRef(onDraftChange);
  report.current = onDraftChange;
  useEffect(() => {
    report.current?.({ fields, editing });
  }, [fields, editing]);

  const update = (key, value) => setFields(prev => ({ ...prev, [key]: value }));

  return (
    <View style={styles.form}>
      {editing ? (
        <View style={styles.fields}>
          {RC_FIELDS.map(([key, labelKey]) => (
            <TextField
              key={key}
              label={t(labelKey)}
              value={fields[key]}
              onChangeText={value => update(key, key === 'mfgYear' ? value.replace(/\D/g, '').slice(0, 4) : value)}
              editable={!disabled}
              autoCapitalize={key === 'make' || key === 'model' || key === 'variant' ? 'words' : 'characters'}
              autoCorrect={false}
              keyboardType={key === 'mfgYear' ? 'number-pad' : 'default'}
            />
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {RC_FIELDS.map(([key, labelKey], index) => (
            <KeyValueRow
              key={key}
              label={t(labelKey)}
              value={fields[key] || '—'}
              valueColor={fields[key] ? colors.heading : colors.placeholder}
              showDivider={index < RC_FIELDS.length - 1}
              dense
            />
          ))}
        </View>
      )}

      <Button
        title={t('inspector.identity.confirmSave')}
        onPress={() => onSave(formatMaskedRcNote(fields), rcEvidence(fields))}
        disabled={disabled || !hasRcDetails(fields)}
        loading={saving}
      />
      <View style={styles.row}>
        {!editing ? (
          <Button
            title={t('inspector.identity.edit')}
            size="sm"
            variant="outline"
            onPress={() => setEditing(true)}
            disabled={disabled}
            style={styles.flex}
          />
        ) : null}
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
  fields: {
    gap: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});

export default RcForm;
