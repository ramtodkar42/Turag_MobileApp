import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Button from './Button';
import Card from './Card';
import UploadThumb from './UploadThumb';
import { colors, spacing } from '../../theme';
import { fs } from '../../utils/responsive';
import { useT } from '../../i18n';

// Document / photo-angle row. Before upload: icon + "Upload". After: a
// thumbnail of the file with a green tick, and "Change" to replace it
// (onChange; the new file replaces the old one once it's uploaded).
function UploadRow({
  title,
  subtitle,
  icon,
  preview,
  uploaded = false,
  loading = false,
  error,
  onUpload,
  onChange,
  uploadLabel: uploadLabelProp,
  style,
}) {
  const t = useT();
  const uploadLabel = uploadLabelProp ?? t('common.upload');
  return (
    <Card padded={false} style={[styles.card, style]}>
      <UploadThumb preview={uploaded ? preview : null} icon={icon} done={uploaded} />
      <View style={styles.text}>
        <AppText variant="title" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        {error ? (
          <AppText variant="caption" color={colors.danger} style={styles.subtitle}>
            {error}
          </AppText>
        ) : subtitle ? (
          <AppText variant="caption" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {uploaded ? (
        <Button
          title={t('common.change')}
          size="sm"
          variant="outline"
          loading={loading}
          onPress={onChange ?? onUpload}
          style={styles.button}
        />
      ) : (
        <Button
          title={uploadLabel}
          size="sm"
          variant="dark"
          loading={loading}
          onPress={onUpload}
          style={styles.button}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: fs(13),
    lineHeight: fs(18),
  },
  subtitle: {
    fontSize: fs(10),
    lineHeight: fs(14),
  },
  button: {
    minWidth: fs(72),
  },
});

export default UploadRow;
