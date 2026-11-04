import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Badge, Card, FillImage, Icon, SkeletonBox } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { formatNumber } from '../../../../utils/format';
import { useT } from '../../../../i18n';
import { getInspectionReport } from '../../../../api/services/report.api';

const THUMBS = 6;

// The vehicle report at the top of the listing form (the web's report summary): the
// photos and the condition overview, so the seller confirms it's the right vehicle.
// Best effort: when it can't load, it just isn't shown; the form never depends on it.
function ListingReportSummary({ inspectionId, vehicle, style }) {
  const t = useT();
  const [report, setReport] = useState(null);
  const [state, setState] = useState(inspectionId ? 'loading' : 'none');
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!inspectionId) return undefined;
    let live = true;
    getInspectionReport(inspectionId)
      .then(next => {
        if (!live) return;
        setReport(next);
        setState('ready');
      })
      .catch(() => {
        if (live) setState('none');
      });
    return () => {
      live = false;
    };
  }, [inspectionId]);

  if (state === 'none') return null;
  if (state === 'loading') {
    return (
      <Card style={[styles.card, style]}>
        <SkeletonBox width="60%" height={ms(18)} />
        <SkeletonBox width="100%" height={ms(180)} />
      </Card>
    );
  }

  const photos = report.photos ?? [];
  const thumbs = photos.slice(0, THUMBS);
  const more = photos.length - thumbs.length;
  const index = Math.min(photoIndex, Math.max(photos.length - 1, 0));
  const fuel = report.vehicle?.fuel || vehicle?.fuel;
  const chips = [
    report.grade ? { label: t('selling.create.report.grade'), value: report.grade } : null,
    report.coverage != null ? { label: t('selling.create.report.covered'), value: `${report.coverage}%` } : null,
    report.odometerKm != null ? { label: t('selling.create.report.odometer'), value: `${formatNumber(String(report.odometerKm))} km` } : null,
    // Counted as previous owners on the report; shown in total, with the seller.
    report.ownersDeclared != null ? { label: t('selling.create.report.owners'), value: String(report.ownersDeclared + 1) } : null,
    fuel ? { label: t('selling.create.report.fuel'), value: fuel } : null,
  ].filter(Boolean);

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.head}>
        <AppText variant="h3" style={styles.flex}>
          {t('selling.create.report.title')}
        </AppText>
        <Badge
          size="sm"
          tone="success"
          label={t('selling.create.report.ready')}
          icon={<Icon name="check" size={ms(11)} color={colors.success} strokeWidth={2.8} />}
        />
      </View>

      {photos.length > 0 ? (
        <View style={styles.main}>
          <FillImage source={{ uri: photos[index].uri }} />
          <View style={styles.count}>
            <AppText style={styles.countText}>{`${index + 1}/${photos.length}`}</AppText>
          </View>
        </View>
      ) : (
        <View style={[styles.main, styles.empty]}>
          <AppText variant="caption" align="center">
            {t('selling.create.report.noPhotos')}
          </AppText>
        </View>
      )}

      {thumbs.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {thumbs.map((photo, i) => (
            <Pressable
              key={photo.id}
              onPress={() => setPhotoIndex(i)}
              accessibilityRole="button"
              accessibilityLabel={t('selling.create.report.showPhoto', { n: i + 1 })}
              accessibilityState={{ selected: i === index }}
              style={[styles.thumb, i === index && styles.thumbOn]}
            >
              <FillImage source={{ uri: photo.uri }} />
            </Pressable>
          ))}
          {more > 0 ? (
            <Pressable
              onPress={() => setPhotoIndex(thumbs.length)}
              accessibilityRole="button"
              accessibilityLabel={t('selling.create.report.morePhotos')}
              style={[styles.thumb, styles.more, index >= thumbs.length && styles.thumbOn]}
            >
              <AppText variant="label" color={colors.heading}>{`+${more}`}</AppText>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map(chip => (
            <View key={chip.label} style={styles.chip}>
              <AppText style={styles.chipValue}>{chip.value}</AppText>
              <AppText variant="caption">{chip.label}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const THUMB_W = ms(72);
const THUMB_H = ms(54);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  main: {
    aspectRatio: 4 / 3,
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.input,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  count: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: ms(2),
    borderRadius: radius.pill,
    backgroundColor: colors.overlay,
  },
  countText: {
    fontFamily: fonts.subtitle.medium,
    fontSize: fs(12),
    lineHeight: fs(16),
    color: colors.white,
  },
  thumbs: {
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    overflow: 'hidden',
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.input,
  },
  thumbOn: {
    borderColor: colors.primary,
  },
  more: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  chip: {
    minWidth: ms(84),
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  chipValue: {
    fontFamily: fonts.subtitle.bold,
    fontSize: fs(14),
    lineHeight: fs(19),
    color: colors.heading,
  },
});

export default ListingReportSummary;
