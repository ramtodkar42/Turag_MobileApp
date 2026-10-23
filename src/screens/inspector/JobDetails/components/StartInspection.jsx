import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow, Divider, FadeIn, TextField } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { isValidRegNumber, normalizeRegNumber } from '../../../../utils/validators';
import {
  proposeJobVehicle,
  startJobInspection,
  startManualInspection,
} from '../../../../api/services/inspector.api';
import { useT } from '../../../../i18n';
import ManualIdentify from './ManualIdentify';
import VehicleConfirmCard from './VehicleConfirmCard';

// "Start inspection" (as the web's on-site panel): type the RC number from
// the vehicle, check the registry details are this vehicle, then start -
// that creates the inspection and marks the job "Inspector on site". When the
// RC can't be matched, identify it by make / model instead (same result).
// onStarted(inspectionId); onExpired(): the server says the slot has lapsed.
function StartInspection({ job, onStarted, onExpired }) {
  const t = useT();
  const [plate, setPlate] = useState('');
  const [proposal, setProposal] = useState(null);
  const [finding, setFinding] = useState(false);
  const [starting, setStarting] = useState(false);
  const [manual, setManual] = useState(false);
  const [error, setError] = useState('');
  const [errorAt, setErrorAt] = useState('find'); // 'find' | 'manual': where the message shows

  const onFind = async () => {
    setFinding(true);
    setError('');
    setErrorAt('find');
    try {
      setProposal(await proposeJobVehicle(plate));
    } catch (e) {
      // No match for the plate: the make / model form is the way on.
      if (e.code === 'NOT_FOUND') {
        setManual(true);
      }
      setError(e.message || t('inspector.start.findError'));
    } finally {
      setFinding(false);
    }
  };

  // Both paths end the same way: open the capture, or say what went wrong.
  const start = async (action, where = 'find') => {
    setStarting(true);
    setError('');
    setErrorAt(where);
    try {
      const { inspectionId } = await action();
      onStarted(inspectionId);
    } catch (e) {
      if (e.code === 'BOOKING_EXPIRED') {
        setError(t('inspector.start.expired'));
        onExpired?.();
      } else if (e.code === 'CHECKLIST_NOT_FOUND') {
        setError(t('inspector.start.noChecklist'));
      } else {
        setError(e.message || t('inspector.start.error'));
      }
      setStarting(false);
    }
  };

  const errorText = error ? (
    <AppText variant="caption" color={colors.danger} style={styles.text}>
      {error}
    </AppText>
  ) : null;

  if (proposal) {
    return (
      <FadeIn>
        <VehicleConfirmCard vehicle={proposal} plate={plate} style={styles.vehicle} />
        <ButtonRow style={styles.button}>
          <Button
            title={t('inspector.start.notThis')}
            variant="outline"
            onPress={() => {
              // Nothing was saved yet: drop it and type another number.
              setProposal(null);
              setPlate('');
              setError('');
            }}
            disabled={starting}
            style={styles.flex}
          />
          <Button
            title={t('inspector.start.start')}
            onPress={() => start(() => startJobInspection({ job, registrationNumber: plate }))}
            loading={starting}
            style={styles.flex}
          />
        </ButtonRow>
        {errorText}
      </FadeIn>
    );
  }

  return (
    <View>
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
        disabled={!isValidRegNumber(plate) || starting}
        loading={finding}
        style={styles.button}
      />
      {errorAt === 'find' ? errorText : null}

      <View style={styles.or}>
        <Divider style={styles.line} />
        <AppText variant="caption">{t('inspector.manual.or')}</AppText>
        <Divider style={styles.line} />
      </View>
      {manual ? (
        <FadeIn>
          <ManualIdentify
            category={job.category}
            busy={starting}
            onSubmit={values => start(() => startManualInspection({ job, ...values }), 'manual')}
          />
          {errorAt === 'manual' ? errorText : null}
        </FadeIn>
      ) : (
        <Button
          title={t('inspector.manual.open')}
          size="md"
          variant="outline"
          onPress={() => setManual(true)}
          style={styles.button}
        />
      )}
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
  or: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  line: {
    flex: 1,
  },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
});

export default StartInspection;
