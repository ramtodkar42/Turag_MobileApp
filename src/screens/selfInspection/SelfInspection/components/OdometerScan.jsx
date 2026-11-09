import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Spinner, TextField } from '../../../../components';
import { colors, fonts, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { formatNumber } from '../../../../utils/format';
import { readOdometerPhoto } from '../../../../api/services/aiScan.api';
import { takePhotoWithBase64 } from '../../../../utils/pickVideo';
import { parseOdometerKm } from '../../../../vendor/selfInspectionLogic';

// "Read it from a photo" for the odometer (the web's OdoExtractCard): a
// dashboard photo is read by AI on Turag's server, the user confirms or corrects the km, and
// only a confirmed number is saved (onConfirmKm(km, photo)). Unreadable -> type it in.
// Camera only (as the web): the photo is kept as the odometer evidence QC sees, so it
// must be of this dashboard, now - never an old picture from the gallery.
// photo: the file behind the number (no base64), or null if no photo was taken. It's
// passed on even when the number was typed after a failed read.
function OdometerScan({ disabled, onConfirmKm }) {
  const t = useT();
  // 'pending' | 'reading' | 'detected' | 'manual'
  const [phase, setPhase] = useState('pending');
  const [detected, setDetected] = useState(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const run = useRef(0);
  const scanFile = useRef(null);

  const read = async () => {
    const id = ++run.current;
    let asset;
    try {
      asset = await takePhotoWithBase64();
    } catch (e) {
      setError(t(e?.message === 'camera_permission' ? 'selfInspection.odometer.cameraOff' : 'selfInspection.odometer.photoError'));
      return;
    }
    if (!asset?.base64) return;
    const { base64, ...file } = asset;
    scanFile.current = file;
    setPhase('reading');
    setError('');
    try {
      const reading = await readOdometerPhoto(base64);
      if (id !== run.current) return;
      const km = reading == null ? null : parseOdometerKm(String(reading));
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
    onConfirmKm(km, scanFile.current);
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
            onPress={read}
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
            <Button title={t('selfInspection.confirm')} size="sm" fullWidth={false} disabled={disabled} onPress={() => onConfirmKm(detected, scanFile.current)} />
            <Button title={t('selfInspection.edit')} size="sm" variant="outline" fullWidth={false} disabled={disabled} onPress={() => setPhase('manual')} />
            <Button title={t('selfInspection.retake')} size="sm" variant="ghost" fullWidth={false} disabled={disabled} onPress={read} />
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
            <Button title={t('selfInspection.retake')} size="sm" variant="ghost" fullWidth={false} disabled={disabled} onPress={read} />
          </View>
        </>
      )}
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
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
