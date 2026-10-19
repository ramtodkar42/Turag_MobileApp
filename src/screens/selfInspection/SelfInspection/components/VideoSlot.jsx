import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon, IconTile, OptionSheet, Spinner } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// The dashboard video (the web's renderVideoItem): one slot - record it or
// choose one; once added, tap to replace. onAdd(source): 'record' | 'gallery'.
function VideoSlot({ have, busy, disabled, message, onAdd }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={busy || disabled}
        accessibilityRole="button"
        style={({ pressed }) => [styles.slot, have && styles.have, pressed && styles.pressed]}
      >
        {busy ? (
          <Spinner size={ms(32)} />
        ) : (
          <IconTile
            name={have ? 'check' : 'play'}
            size={ms(36)}
            color={have ? colors.success : colors.primary}
            backgroundColor={have ? colors.successLight : colors.dangerLight}
          />
        )}
        <AppText variant="label" color={colors.heading} style={styles.text}>
          {busy ? t('selfInspection.uploading') : have ? t('selfInspection.video.replace') : t('selfInspection.video.add')}
        </AppText>
        <Icon name="chevronRight" size={ms(14)} color={colors.placeholder} />
      </Pressable>
      {message ? (
        <AppText variant="caption" color={message.kind === 'error' ? colors.danger : colors.body}>
          {message.text}
        </AppText>
      ) : null}
      <OptionSheet
        visible={open}
        title={t('selfInspection.video.title')}
        options={[
          { value: 'record', label: t('selfInspection.video.record') },
          { value: 'gallery', label: t('selfInspection.source.gallery') },
        ]}
        onSelect={onAdd}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  have: {
    borderColor: colors.success,
  },
  pressed: {
    backgroundColor: colors.dangerLight,
  },
  text: {
    flex: 1,
  },
});

export default VideoSlot;
