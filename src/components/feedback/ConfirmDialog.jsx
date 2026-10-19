import { Modal, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import Button from '../common/Button';
import { colors, radius, shadows, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// App-styled confirmation dialog (replaces the system Alert).
// Two buttons by default; pass cancelLabel={null} for a single "OK" style dialog.
// Labels default to "Confirm" / "Cancel" in the app language.
function ConfirmDialog({
  visible,
  title,
  message,
  icon,
  confirmLabel: confirmLabelProp,
  cancelLabel: cancelLabelProp,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const t = useT();
  const confirmLabel = confirmLabelProp ?? t('common.confirm');
  const cancelLabel = cancelLabelProp === undefined ? t('common.cancel') : cancelLabelProp;
  const close = () => !loading && onCancel?.();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('common.close')} />
        <View style={styles.card} accessibilityRole="alert">
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <AppText variant="h3" align="center" style={styles.title}>
            {title}
          </AppText>
          {message ? (
            <AppText variant="subtitle" align="center" style={styles.message}>
              {message}
            </AppText>
          ) : null}

          <View style={styles.actions}>
            {cancelLabel ? (
              <Button
                title={cancelLabel}
                variant="outline"
                size="md"
                onPress={close}
                disabled={loading}
                style={styles.flex}
              />
            ) : null}
            <Button
              title={confirmLabel}
              size="md"
              onPress={onConfirm}
              loading={loading}
              style={styles.flex}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: ms(360),
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.lg,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fs(19),
    lineHeight: fs(25),
  },
  message: {
    marginTop: spacing.sm,
    fontSize: fs(14),
    lineHeight: fs(20),
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
});

export default ConfirmDialog;
