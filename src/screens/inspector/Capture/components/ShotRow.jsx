import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, UploadThumb } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// One photo / document an item needs: a thumbnail (ticked once it's in), its
// name, and Take photo (in-app camera) - plus Upload (gallery) for documents.
// Once done the buttons become Retake / Change, which replace the file
// (the parent asks first).
function ShotRow({ title, state, document, onCamera, onGallery }) {
  const t = useT();
  const icon = <Icon name={document ? 'document' : 'camera'} size={ms(20)} color={colors.body} />;

  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <UploadThumb preview={state.preview} icon={icon} done={state.done} />
        <View style={styles.text}>
          <AppText variant="label" color={colors.heading} numberOfLines={2}>
            {title}
          </AppText>
          {state.error ? (
            <AppText variant="caption" color={colors.danger}>
              {state.error}
            </AppText>
          ) : state.done && state.isPdf ? (
            <AppText variant="caption">{t('inspector.capture.pdfUploaded')}</AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.buttons}>
        <Button
          title={t(state.done ? 'inspector.capture.retake' : 'inspector.capture.takePhoto')}
          size="sm"
          variant={state.done ? 'outline' : 'primary'}
          onPress={onCamera}
          loading={state.uploading}
        />
        {document ? (
          <Button
            title={t(state.done ? 'common.change' : 'inspector.capture.upload')}
            size="sm"
            variant="outline"
            onPress={onGallery}
            disabled={state.uploading}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});

export default memo(ShotRow);
