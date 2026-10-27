import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Avatar, Chevron, IconButton, Icon, OptionSheet, PopIn, Spinner } from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const PHOTO = ms(104);
const RING = ms(4);
const OUTER = PHOTO + RING * 2;
const BADGE = ms(32);
const MUTED_WHITE = 'rgba(255, 255, 255, 0.85)';
const CIRCLE = 'rgba(255, 255, 255, 0.07)';

// The top of Personal Information (Turag's colours): a red band with the back
// button, the name and how to reach them; the photo sits half over the band's
// edge, with a camera badge; under it, on white, the role. Tapping the photo
// offers the selfie camera or the gallery. While a photo saves, the new picture shows dimmed under a progress
// ring; once saved, a green tick and "Photo updated"; if saving fails, the
// reason and "Try again".
// photoSource: the account photo (useAvatarSource) | null; photo: useProfilePhoto();
// contact: the email or mobile under the name.
function ProfileHeader({ name, contact, role, photoSource, photo, onBack }) {
  const t = useT();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { uploading, preview, saved, error, canRetry } = photo;
  const open = () => !uploading && setSheetOpen(true);
  const shown = preview ?? photoSource;

  let status = null;
  if (uploading) {
    status = t('profile.photo.saving');
  } else if (saved) {
    status = t('profile.photo.saved');
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.band}>
        {/* Two large soft circles from the top right corner. */}
        <View pointerEvents="none" style={[styles.circle, styles.circleOuter]} />
        <View pointerEvents="none" style={[styles.circle, styles.circleInner]} />

        <View style={styles.bar}>
          <IconButton
            onPress={onBack}
            size={ms(40)}
            backgroundColor={colors.whiteTranslucent}
            accessibilityLabel={t('common.back')}
          >
            <Chevron direction="left" size={ms(9)} color={colors.white} style={styles.back} />
          </IconButton>
        </View>

        <AppText variant="h1" color={colors.white} align="center" numberOfLines={1} style={styles.name}>
          {name}
        </AppText>
        {contact ? (
          <AppText variant="caption" color={MUTED_WHITE} align="center" numberOfLines={1} style={styles.contact}>
            {contact}
          </AppText>
        ) : null}
      </View>

      {/* The photo, half over the band's edge. */}
      <Pressable
        onPress={open}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={t('profile.photo.change')}
        accessibilityState={{ busy: uploading }}
        style={({ pressed }) => [styles.ring, saved && styles.ringSaved, pressed && styles.pressed]}
      >
        <Avatar source={shown} name={name} size={PHOTO} />
        {uploading ? (
          <View style={styles.veil}>
            <Spinner size={ms(44)} color={colors.white} trackColor="rgba(255,255,255,0.3)" />
          </View>
        ) : null}
        {!uploading ? (
          saved ? (
            <PopIn style={[styles.badge, styles.badgeSaved]}>
              <Icon name="check" size={ms(15)} color={colors.white} strokeWidth={3} />
            </PopIn>
          ) : (
            <View style={styles.badge}>
              <Icon name="camera" size={ms(15)} color={colors.white} />
            </View>
          )
        ) : null}
      </Pressable>

      <View style={styles.role}>
        <AppText variant="label" color={colors.primary} style={styles.roleText}>
          {role}
        </AppText>
      </View>

      {/* The photo's state: saving / saved, or what went wrong. */}
      {error ? (
        <View style={styles.error}>
          <Icon name="close" size={ms(13)} color={colors.danger} />
          <AppText variant="caption" color={colors.danger} style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : status ? (
        <AppText variant="caption" color={saved ? colors.success : colors.muted} align="center" style={styles.status}>
          {status}
        </AppText>
      ) : null}

      {canRetry ? (
        <Pressable
          onPress={photo.retry}
          accessibilityRole="button"
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <AppText variant="label" color={colors.white}>
            {t('common.retry')}
          </AppText>
        </Pressable>
      ) : null}

      <OptionSheet
        visible={sheetOpen}
        title={t('profile.photo.title')}
        options={[
          { value: 'camera', label: t('profile.photo.camera') },
          { value: 'gallery', label: t('profile.photo.gallery') },
        ]}
        onSelect={photo.change}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // White under the band, rounded at the bottom over the page's grey.
  wrap: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  // Room at the bottom for the top half of the photo.
  band: {
    alignSelf: 'stretch',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingBottom: OUTER / 2 + spacing.xl,
    backgroundColor: colors.primary,
  },
  circle: {
    position: 'absolute',
    backgroundColor: CIRCLE,
  },
  circleOuter: {
    width: ms(560),
    height: ms(560),
    borderRadius: ms(280),
    top: -ms(330),
    right: -ms(300),
  },
  circleInner: {
    width: ms(380),
    height: ms(380),
    borderRadius: ms(190),
    top: -ms(240),
    right: -ms(210),
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    minHeight: ms(56),
  },
  back: {
    marginLeft: -ms(2),
  },
  name: {
    maxWidth: '100%',
    marginTop: spacing.md,
    fontSize: fs(26),
    lineHeight: fs(32),
  },
  contact: {
    marginTop: spacing.xs,
    maxWidth: '100%',
  },
  ring: {
    width: OUTER,
    height: OUTER,
    marginTop: -OUTER / 2,
    borderRadius: OUTER / 2,
    borderWidth: RING,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    ...shadows.md,
  },
  ringSaved: {
    borderColor: colors.successLight,
  },
  pressed: {
    opacity: 0.85,
  },
  veil: {
    position: 'absolute',
    width: PHOTO,
    height: PHOTO,
    borderRadius: PHOTO / 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  badgeSaved: {
    backgroundColor: colors.success,
  },
  role: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: ms(4),
    borderRadius: radius.pill,
    backgroundColor: colors.dangerLight,
  },
  roleText: {
    fontSize: fs(12),
    lineHeight: fs(16),
  },
  status: {
    marginTop: spacing.sm,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: '90%',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerLight,
  },
  errorText: {
    flexShrink: 1,
  },
  retry: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});

export default ProfileHeader;
