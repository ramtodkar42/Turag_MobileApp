import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppRefreshControl,
  AppText,
  Badge,
  Button,
  CardListSkeleton,
  FadeIn,
  Header,
  Icon,
  ScreenContainer,
  StatusView,
} from '../../../components';
import { colors, radius, shadows, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatINR } from '../../../utils/format';
import { formatSlot } from '../../../utils/date';
import useRemoteData from '../../../hooks/useRemoteData';
import { getMyListings } from '../../../api/services/sellerListing.api';
import { ROUTES } from '../../../navigation/routes';
import { currentHomeRoute } from '../../../navigation/homeRoute';
import { useT } from '../../../i18n';
import { LISTING_STATUS } from '../../account/statuses';

// When the listing went live / expired / was made (as the web's sub-line).
const whenLabel = (t, listing) => {
  if ((listing.status === 'LIVE' || listing.status === 'RESERVED') && listing.publishedAt) {
    return t('selling.list.liveSince', { date: formatSlot(listing.publishedAt) });
  }
  if (listing.status === 'EXPIRED' && listing.expiresAt) {
    return t('selling.list.expiredOn', { date: formatSlot(listing.expiresAt) });
  }
  return listing.createdAt ? t('selling.list.createdOn', { date: formatSlot(listing.createdAt) }) : null;
};

const ListingRow = memo(function ListingRow({ listing, onPress }) {
  const t = useT();
  const status = LISTING_STATUS[listing.status] ?? LISTING_STATUS.DRAFT;
  const verification = listing.verificationLabel ? `selling.verification.${listing.verificationLabel}` : null;
  return (
    <Pressable
      onPress={() => onPress(listing)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <AppText variant="title" style={styles.name} numberOfLines={1}>
          {[listing.vehicle.make, listing.vehicle.model, listing.vehicle.year].filter(Boolean).join(' ')}
        </AppText>
        <Badge label={t(status.labelKey)} tone={status.tone} size="sm" />
      </View>
      {verification ? (
        <AppText variant="caption" style={styles.meta}>
          {t(verification)}
        </AppText>
      ) : null}
      <View style={styles.bottom}>
        <View style={styles.flex}>
          <AppText variant="caption">{t('selling.askingPrice')}</AppText>
          <AppText variant="title" color={colors.success} style={styles.price}>
            {listing.askPrice != null ? formatINR(listing.askPrice) : '—'}
          </AppText>
          <AppText variant="caption" style={styles.meta}>
            {whenLabel(t, listing)}
          </AppText>
        </View>
        <View style={styles.manage}>
          <AppText variant="label" color={colors.primary}>
            {t('selling.list.manage')}
          </AppText>
          <Icon name="chevronRight" size={ms(14)} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
});

// My listings (Profile), as the web's: every listing the user made, newest
// first, with its status; open one to manage it, or list another vehicle
// (from the Garage - a listing needs a valued vehicle).
function MyListings({ navigation }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { data, loading, refreshing, error, refresh, reload } = useRemoteData(getMyListings);

  const renderItem = useCallback(
    ({ item }) => (
      <ListingRow
        listing={item}
        onPress={listing => navigation.navigate(ROUTES.MY_LISTING, { listingId: listing.id })}
      />
    ),
    [navigation],
  );

  let body;
  if (loading) {
    body = <CardListSkeleton cards={[3, 3, 3]} style={styles.skeleton} />;
  } else if (error) {
    body = (
      <StatusView title={t('selling.list.error')} message={error}>
        <Button title={t('common.retry')} size="md" onPress={reload} style={styles.action} />
      </StatusView>
    );
  } else {
    body = (
      <FadeIn offset={0} style={styles.flex}>
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <AppText variant="subtitle" style={styles.intro}>
              {t('selling.list.subtitle')}
            </AppText>
          }
          ListEmptyComponent={
            <StatusView title={t('selling.list.empty.title')} message={t('selling.list.empty.message')} style={styles.empty} />
          }
          refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }}
          showsVerticalScrollIndicator={false}
        />
      </FadeIn>
    );
  }

  return (
    <ScreenContainer
      header={<Header onBack={navigation.goBack} title={t('selling.list.title')} />}
      footer={
        <Button
          title={t('selling.list.listVehicle')}
          onPress={() => navigation.navigate(currentHomeRoute(), { screen: ROUTES.GARAGE })}
        />
      }
    >
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  skeleton: {
    marginTop: spacing.md,
  },
  intro: {
    marginTop: spacing.sm,
  },
  empty: {
    marginTop: spacing.xxl,
  },
  action: {
    marginTop: spacing.lg,
  },
  row: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  pressed: {
    opacity: 0.85,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  meta: {
    marginTop: spacing.xxs,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  price: {
    fontSize: fs(17),
    lineHeight: fs(23),
  },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
});

export default MyListings;
