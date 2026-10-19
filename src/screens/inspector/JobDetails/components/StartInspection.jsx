import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, FadeIn, KeyValueCard, TextField } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatRegNumber, isValidRegNumber, normalizeRegNumber } from '../../../../utils/validators';
import { proposeVehicle } from '../../../../api/services/valuation.api';
import { startJobInspection } from '../../../../api/services/inspector.api';
import { useT } from '../../../../i18n';
import { toDetailRows } from '../../../valuation/components/vehicleRows';

// "Start inspection" (as the web's on-site panel): type the RC number from
// the vehicle, check the registry details are this vehicle, then start -
// that creates the inspection and marks the job "Inspector on site".
// onStarted(inspectionId).
function StartInspection({ job, onStarted }) {
  const t = useT();
  const [plate, setPlate] = useState('');
  const [proposal, setProposal] = useState(null);
  const [finding, setFinding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const onFind = async () => {
    setFinding(true);
    setError('');
    try {
      setProposal(await proposeVehicle(plate));
    } catch (e) {
      setError(e.message || t('inspector.start.findError'));
    } finally {
      setFinding(false);
    }
  };

  const onStart = async () => {
    setStarting(true);
    setError('');
    try {
      const { inspectionId } = await startJobInspection({ job, registrationNumber: plate });
      onStarted(inspectionId);
    } catch (e) {
      setError(
        e.code === 'CHECKLIST_NOT_FOUND' ? t('inspector.start.noChecklist') : e.message || t('inspector.start.error'),
      );
      setStarting(false);
    }
  };

  return (
    <View>
      {!proposal ? (
        <>
          <AppText variant="subtitle" style={styles.text}>
            {t('inspector.start.hint')}
          </AppText>
          <TextField
            label={t('valuation.evaluate.regLabel')}
            placeholder={t('valuation.evaluate.regPlaceholder')}
            value={plate}
            onChangeText={text => {
              setPlate(normalizeRegNumber(text));
              setError('');
            }}
            valid={isValidRegNumber(plate)}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            style={styles.field}
          />
          <Button
            title={t('inspector.start.find')}
            size="md"
            onPress={onFind}
            disabled={!isValidRegNumber(plate)}
            loading={finding}
            style={styles.button}
          />
        </>
      ) : (
        <FadeIn>
          <KeyValueCard
            dense
            header={
              <View style={styles.vehicleHeader}>
                <AppText variant="h3" style={styles.name}>
                  {proposal.make} {proposal.model}, {proposal.year}
                </AppText>
                <AppText variant="caption">{formatRegNumber(plate)}</AppText>
                <AppText variant="title" style={styles.question}>
                  {t('inspector.start.isThis')}
                </AppText>
              </View>
            }
            rows={toDetailRows(proposal, t).slice(0, 6)}
            style={styles.vehicle}
          />
          <ButtonRow style={styles.button}>
            <Button
              title={t('inspector.start.notThis')}
              variant="outline"
              onPress={() => setProposal(null)}
              disabled={starting}
              style={styles.flex}
            />
            <Button title={t('inspector.start.start')} onPress={onStart} loading={starting} style={styles.flex} />
          </ButtonRow>
        </FadeIn>
      )}
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.text}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    marginTop: spacing.sm,
  },
  field: {
    marginTop: spacing.md,
  },
  button: {
    marginTop: spacing.md,
  },
  vehicle: {
    marginTop: spacing.md,
  },
  vehicleHeader: {
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fs(17),
    lineHeight: fs(23),
  },
  question: {
    marginTop: spacing.sm,
    fontSize: fs(14),
    lineHeight: fs(19),
  },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
});

export default StartInspection;
