import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, ChipTabs, Chevron, Icon, IconButton, ImageCarousel, Spinner } from '../../../components';
import { colors, radius, shadows, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import { toggleSaved, useIsSaved } from '../../../store/savedStore';

const ROUND = ms(40);

// The vehicle page's photos, edge to edge under the status bar: round white
// back and bookmark (saves it - same list as the Saved tab) buttons, a
// "Verified" badge, dots below. When the listing has categorised photos, tabs
// (Exterior 7, Engine 1, ...) under it pick which group shows, like the web
// (showTabs={false}: no tabs - the first group, e.g. on the offer screen).
function VehicleGallery({ vehicle, onBack, loading = false, showTabs = true, style }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const saved = useIsSaved(vehicle.id);
  const groups = vehicle.photoGroups ?? [];
  const [active, setActive] = useState(null);

  const current = groups.find(g => g.category === active) ?? groups[0];
  const images = current?.images ?? vehicle.images ?? (vehicle.image ? [vehicle.image] : []);

  const tabs = groups.map(g => {
    const label = t(`marketplace.photos.${g.category}`);
    const count = g.images.length;
    return {
      id: g.category,
      label,
      count,
      accessibilityLabel: t('marketplace.photos.tabA11y', { label, count }),
    };
  });

  return (
    <View style={style}>
      {/* key: a new tab starts again at its first photo. */}
      <ImageCarousel
        key={current?.category ?? 'all'}
        images={images}
        aspectRatio={1.2}
        rounded={false}
        dotsBelow
        cornerInset={insets.top}
        topLeft={
          <IconButton onPress={onBack} size={ROUND} backgroundColor={colors.white} accessibilityLabel={t('common.back')} style={styles.round}>
            <Chevron direction="left" size={ms(9)} style={styles.back} />
          </IconButton>
        }
        topRight={
          <IconButton
            onPress={() => toggleSaved(vehicle)}
            size={ROUND}
            backgroundColor={colors.white}
            accessibilityLabel={t(saved ? 'common.removeFromSaved' : 'common.saveVehicle')}
            style={styles.round}
          >
            <Icon name="bookmark" size={ms(18)} color={saved ? colors.primary : colors.heading} filled={saved} />
          </IconButton>
        }
        bottomLeft={
          vehicle.verified ? (
            <View style={styles.verified}>
              <Icon name="shieldCheck" size={ms(14)} color={colors.white} />
              <AppText variant="label" color={colors.white} style={styles.verifiedText}>
                {t('common.verified')}
              </AppText>
            </View>
          ) : null
        }
        bottomRight={
          loading ? (
            <View style={styles.loading}>
              <Spinner size={ms(13)} color={colors.white} trackColor="rgba(255,255,255,0.35)" />
              <AppText variant="label" color={colors.white} style={styles.loadingText}>
                {t('marketplace.loadingDetails')}
              </AppText>
            </View>
          ) : null
        }
      />
      {showTabs && tabs.length > 0 ? (
        <ChipTabs tabs={tabs} value={current.category} onChange={setActive} style={styles.tabs} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  round: {
    ...shadows.sm,
  },
  back: {
    marginLeft: ms(3),
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  verifiedText: {
    fontSize: fs(12),
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(25,25,25,0.72)',
  },
  loadingText: {
    fontSize: fs(12),
  },
  tabs: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});

export default VehicleGallery;
