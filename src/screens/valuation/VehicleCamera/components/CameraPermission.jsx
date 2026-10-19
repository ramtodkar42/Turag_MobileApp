import { Linking, StyleSheet, View } from 'react-native';
import { AppText, Button } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { useT } from '../../../../i18n';

// Shown when the app can't use the camera yet. Asks once; if the user said
// "Don't allow", sends them to Settings instead.
function CameraPermission({ canAsk, onRequest, onClose }) {
  const t = useT();
  return (
    <View style={styles.container}>
      <AppText variant="h3" align="center" color={colors.white}>
        {t('valuation.camera.allowTitle')}
      </AppText>
      <AppText variant="subtitle" align="center" color={colors.border} style={styles.message}>
        {t('valuation.camera.allowMessage')}
      </AppText>
      <Button
        title={canAsk ? t('valuation.camera.allow') : t('valuation.camera.openSettings')}
        onPress={canAsk ? onRequest : () => Linking.openSettings()}
        style={styles.button}
      />
      <Button title={t('common.notNow')} variant="ghost" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  message: {
    marginBottom: spacing.lg,
  },
  button: {
    marginTop: spacing.sm,
  },
});

export default CameraPermission;
