import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Avatar, Icon, OptionSheet } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const PHOTO = ms(64);
const BADGE = ms(24);

// Photo + name + role ("Consumer" / "Inspection Officer"). Tapping the photo
// (or "Change photo") offers the selfie camera or the gallery; while it saves,
// a spinner covers the photo.
// photoSource: the account photo (useAvatarSource) | null; onChangePhoto(source).
function ProfileHeader({ name, role, photoSource, onChangePhoto, uploading = false, error }) {
  const t = useT();
  const [sheetOpen, setSheetOpen] = useState(false);
  const open = () => !uploading && setSheetOpen(true);

  return (
    <View>
      <View style={styles.row}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={t('profile.photo.change')}
          style={styles.photo}
        >
          <Avatar source={photoSource} name={name} size={PHOTO} />
          {uploading ? (
            <View style={styles.veil}>
              <ActivityIndicator color={colors.white} />
            </View>
          ) : (
            <View style={styles.badge}>
              <Icon name="camera" size={ms(13)} color={colors.white} />
            </View>
          )}
        </Pressable>
        <View style={styles.text}>
          <AppText variant="h3" numberOfLines={1} style={styles.name}>
            {name}
          </AppText>
          <AppText variant="caption">{role}</AppText>
          <AppText variant="label" color={colors.primary} onPress={open} style={styles.change}>
            {t(uploading ? 'profile.photo.saving' : 'profile.photo.change')}
          </AppText>
        </View>
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <OptionSheet
        visible={sheetOpen}
        title={t('profile.photo.title')}
        options={[
          { value: 'camera', label: t('profile.photo.camera') },
          { value: 'gallery', label: t('profile.photo.gallery') },
        ]}
        onSelect={onChangePhoto}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PHOTO / 2,
    backgroundColor: colors.overlay,
  },
  badge: {
    position: 'absolute',
    right: -ms(2),
    bottom: -ms(2),
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  text: {
    flex: 1,
  },
  name: {
    fontSize: fs(20),
    lineHeight: fs(26),
  },
  change: {
    marginTop: spacing.xxs,
    alignSelf: 'flex-start',
  },
  error: {
    marginTop: spacing.sm,
  },
});

export default ProfileHeader;
