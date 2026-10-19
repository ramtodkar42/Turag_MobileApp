import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, FillImage, Icon, OptionSheet } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { HIT_SLOP } from '../../../../constants/layout';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Upload control + file list for a document (or single-shot evidence) item -
// the web's evidenceFor. Each file has a remove button; "Upload document" /
// "Add another page" opens: take a photo, choose from the gallery, or (for
// documents) a PDF. onAdd(source) with 'camera' | 'gallery' | 'pdf'.
function EvidenceList({ isDoc, files, thumbs, busy, removing, disabled, message, onAdd, onRemove }) {
  const t = useT();
  const [sourceOpen, setSourceOpen] = useState(false);
  const sources = [
    { value: 'camera', label: t('selfInspection.source.camera') },
    { value: 'gallery', label: t('selfInspection.source.gallery') },
    ...(isDoc ? [{ value: 'pdf', label: t('selfInspection.source.pdf') }] : []),
  ];
  const nounKey = isDoc ? 'selfInspection.noun.DOCUMENT' : 'selfInspection.noun.PHOTO';

  return (
    <View style={styles.wrap}>
      {files.map((f, i) => (
        <View key={f.id} style={styles.row}>
          <View style={styles.thumb}>
            {thumbs[f.id] ? (
              <FillImage source={{ uri: thumbs[f.id] }} />
            ) : (
              <View style={styles.center}>
                <Icon name={isDoc ? 'document' : 'image'} size={ms(18)} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.flex}>
            <AppText style={styles.name}>
              {t(nounKey)}
              {files.length > 1 ? ` ${i + 1}` : ''}
            </AppText>
            <View style={styles.uploaded}>
              <Icon name="check" size={ms(11)} color={colors.success} strokeWidth={2.6} />
              <AppText style={styles.uploadedText}>{t(removing ? 'selfInspection.photo.removing' : 'selfInspection.uploaded')}</AppText>
            </View>
          </View>
          <Pressable
            onPress={() => onRemove(f)}
            disabled={disabled || removing}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={t('selfInspection.removeFile', { noun: t(nounKey) })}
            style={styles.remove}
          >
            <Icon name="trash" size={ms(16)} color={colors.primary} />
          </Pressable>
        </View>
      ))}

      <Button
        title={
          busy
            ? t('selfInspection.uploading')
            : files.length > 0
            ? t(isDoc ? 'selfInspection.addPage' : 'selfInspection.addPhoto')
            : t(isDoc ? 'selfInspection.uploadDocument' : 'selfInspection.addPhotoFirst')
        }
        variant="outline"
        size="sm"
        fullWidth={false}
        loading={busy}
        disabled={disabled}
        leftIcon={busy ? null : <Icon name={isDoc ? 'document' : 'camera'} size={ms(14)} color={colors.primary} />}
        onPress={() => setSourceOpen(true)}
        style={styles.add}
      />
      {isDoc ? <AppText variant="caption" color={colors.placeholder}>{t('selfInspection.docLimit')}</AppText> : null}
      {message ? (
        <AppText variant="caption" color={message.kind === 'error' ? colors.danger : colors.warning}>
          {message.text}
        </AppText>
      ) : null}

      <OptionSheet
        visible={sourceOpen}
        title={t(isDoc ? 'selfInspection.uploadDocument' : 'selfInspection.addPhotoFirst')}
        options={sources}
        onSelect={onAdd}
        onClose={() => setSourceOpen(false)}
      />
    </View>
  );
}

const THUMB = ms(44);

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    overflow: 'hidden',
    borderRadius: radius.sm,
    backgroundColor: colors.dangerLight,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(14),
    lineHeight: fs(19),
    color: colors.heading,
  },
  uploaded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  uploadedText: {
    fontSize: fs(12),
    lineHeight: fs(16),
    color: colors.success,
  },
  remove: {
    padding: spacing.xs,
  },
  add: {
    alignSelf: 'flex-start',
  },
});

export default EvidenceList;
