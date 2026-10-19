import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, OptionSheet, Spinner, TextField } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { formatNumber } from '../../../../utils/format';
import { analyzeOdometerWithOpenAI } from '../../../../api/services/visionScan';
import { pickPhotoWithBase64, takePhotoWithBase64 } from '../../../../utils/pickVideo';
import { parseOdometerKm } from '../../../../vendor/selfInspectionLogic';

// "Read it from a photo" for the odometer (the web's OdoExtractCard): a
// dashboard photo is read by AI, the user confirms or corrects the km, and
// only a confirmed number is saved (onConfirmKm). Unreadable -> type it in.
function OdometerScan({ disabled, onConfirmKm }) {
  const t = useT();
  // 'pending' | 'reading' | 'detected' | 'manual'
  const [phase, setPhase] = useState('pending');
  const [detected, setDetected] = useState(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [sourceOpen, setSourceOpen] = useState(false);
  const run = useRef(0);

  const read = async source => {
    const id = ++run.current;
    let asset;
    try {
      asset = source === 'camera' ? await takePhotoWithBase64() : await pickPhotoWithBase64();
    } catch {
      setError(t('selfInspection.odometer.photoError'));
      return;
    }
    if (!asset?.base64) return;
    setPhase('reading');
    setError('');
    try {
      const res = await analyzeOdometerWithOpenAI(asset.base64);
      if (id !== run.current) return;
      const km = res?.isOdometerVisible ? parseOdometerKm(res.kilometers) : null;
      if (km == null) {
        // Unreadable: never a guess - type it in.
        setPhase('manual');
        setError(t('selfInspection.odometer.unreadable'));
        return;
      }
      setDetected(km);
      setTyped(String(km));
      setPhase('detected');
    } catch {
      if (id !== run.current) return;
      setPhase('manual');
      setError(t('selfInspection.odometer.readError'));
    }
  };

  const saveTyped = () => {
    const km = parseOdometerKm(typed);
    if (km == null) {
      setError(t('selfInspection.error.number'));
      return;
    }
    onConfirmKm(km);
  };

  return (
    <View style={styles.wrap}>
      {phase === 'reading' ? (
        <View style={styles.row}>
          <Spinner size={ms(22)} />
          <AppText variant="caption">{t('selfInspection.odometer.reading')}</AppText>
        </View>
      ) : phase === 'pending' ? (
        <>
          <AppText variant="caption">{t('selfInspection.odometer.hint')}</AppText>
          <Button
            title={t('selfInspection.odometer.addPhoto')}
            size="sm"
            variant="outline"
            fullWidth={false}
            disabled={disabled}
            onPress={() => setSourceOpen(true)}
            style={styles.start}
          />
        </>
      ) : phase === 'detected' ? (
        <>
          <AppText variant="body">
            {t('selfInspection.odometer.detected')}{' '}
            <AppText style={styles.value}>{`${formatNumber(String(detected))} km`}</AppText>
          </AppText>
          <View style={styles.row}>
            <Button title={t('selfInspection.confirm')} size="sm" fullWidth={false} disabled={disabled} onPress={() => onConfirmKm(detected)} />
            <Button title={t('selfInspection.edit')} size="sm" variant="outline" fullWidth={false} disabled={disabled} onPress={() => setPhase('manual')} />
            <Button title={t('selfInspection.retake')} size="sm" variant="ghost" fullWidth={false} disabled={disabled} onPress={() => setSourceOpen(true)} />
          </View>
        </>
      ) : (
        <>
          <TextField
            label={t('selfInspection.odometer.km')}
            value={typed}
            onChangeText={text => setTyped(text.replace(/[^\d,]/g, ''))}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={saveTyped}
          />
          <View style={styles.row}>
            <Button title={t('selfInspection.save')} size="sm" fullWidth={false} disabled={disabled} onPress={saveTyped} />
            <Button title={t('selfInspection.retake')} size="sm" variant="ghost" fullWidth={false} disabled={disabled} onPress={() => setSourceOpen(true)} />
          </View>
        </>
      )}
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
      <OptionSheet
        visible={sourceOpen}
        title={t('selfInspection.odometer.addPhoto')}
        options={[
          { value: 'camera', label: t('selfInspection.source.camera') },
          { value: 'gallery', label: t('selfInspection.source.gallery') },
        ]}
        onSelect={source => setTimeout(() => read(source), 350)}
        onClose={() => setSourceOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  start: {
    alignSelf: 'flex-start',
  },
  value: {
    fontFamily: fonts.title.bold,
    fontSize: fs(16),
    lineHeight: fs(23),
    color: colors.heading,
  },
});

export default OdometerScan;
