import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppRefreshControl,
  AppText,
  Button,
  CardListSkeleton,
  FadeIn,
  StatusView,
  TitledCard,
} from '../../../../components';
import { colors, radius, shadows, spacing } from '../../../../theme';
import { isTablet } from '../../../../utils/responsive';
import { formatPriceShort } from '../../../../utils/format';
import useRemoteData from '../../../../hooks/useRemoteData';
import { getDealerDashboard } from '../../../../api/services/business.api';
import { useT } from '../../../../i18n';
import ActionRow from './ActionRow';
import KpiTile from './KpiTile';
import WeeklyBars from './WeeklyBars';

// Phones: two numbers a row; tablets: three.
const TILE_BASIS = isTablet ? '31%' : '47%';

// Overview (as the web's /dealer, ADR-0060): what's waiting on the signed-in
// dealer first (offers only they can answer, handovers only they can do), then
// the dealership's numbers and 12 weeks of offers and sales.
// top: the portal's header (intro, org, tabs); onGo(tab): opens another tab.
function DealerOverview({ orgId, top, onGo }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const remote = useRemoteData(() => getDealerDashboard(orgId), [orgId]);
  const { data, loading, error, refreshing, refresh, reload } = remote;

  if (loading) {
    return (
      <>
        {top}
        <CardListSkeleton cards={[3, 2, 2]} style={styles.skeleton} />
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        {top}
        <StatusView title={t('business.dealer.overview.error')} message={error}>
          <Button title={t('common.retry')} size="md" onPress={reload} style={styles.retry} />
        </StatusView>
      </>
    );
  }

  const s = data.summary;
  const actions = [];
  if (s.myOffersToAnswer > 0) {
    actions.push({
      key: 'offers',
      tone: s.myOffersExpiringSoon > 0 ? 'urgent' : 'normal',
      title: t('business.dealer.action.offers', { count: s.myOffersToAnswer }),
      detail:
        s.myOffersExpiringSoon > 0
          ? t('business.dealer.action.offersExpiring', { count: s.myOffersExpiringSoon })
          : t('business.dealer.action.offersHint'),
      actionLabel: t('business.dealer.action.reviewOffers'),
      onAction: () => onGo('offers'),
    });
  }
  if (s.myHandoversDue > 0) {
    actions.push({
      key: 'handover',
      tone: 'urgent',
      title: t('business.dealer.action.handovers', { count: s.myHandoversDue }),
      detail: t('business.dealer.action.handoversHint'),
      actionLabel: t('business.dealer.action.openSales'),
      onAction: () => onGo('sales'),
    });
  }
  if (s.awaitingRcTransfer > 0) {
    actions.push({
      key: 'rc',
      tone: 'normal',
      title: t('business.dealer.action.rc', { count: s.awaitingRcTransfer }),
      detail: t('business.dealer.action.rcHint'),
      actionLabel: t('business.dealer.action.view'),
      onAction: () => onGo('sales'),
    });
  }
  if (s.teamOffersToAnswer > 0) {
    actions.push({
      key: 'team',
      tone: 'info',
      title: t('business.dealer.action.team', { count: s.teamOffersToAnswer }),
      detail: t('business.dealer.action.teamHint'),
    });
  }

  const inProgress = s.ordersInProgress + s.awaitingRcTransfer;
  const tiles = [
    {
      key: 'live',
      label: t('business.dealer.kpi.live'),
      value: s.liveListings,
      hint: s.inReview > 0 ? t('business.dealer.kpi.inReview', { count: s.inReview }) : t('business.dealer.kpi.noneInReview'),
    },
    {
      key: 'offers',
      label: t('business.dealer.kpi.openOffers'),
      value: s.offersPending,
      hint: t('business.dealer.kpi.received90', { count: s.offersReceived90d }),
    },
    {
      key: 'progress',
      label: t('business.dealer.kpi.inProgress'),
      value: inProgress,
      hint:
        s.awaitingRcTransfer > 0
          ? t('business.dealer.kpi.awaitingRc', { count: s.awaitingRcTransfer })
          : t('business.dealer.kpi.inProgressHint'),
    },
    {
      key: 'sold',
      label: t('business.dealer.kpi.sold90'),
      value: s.sold90d,
      hint:
        s.sold90d > 0
          ? t('business.dealer.kpi.soldValue', { amount: formatPriceShort(s.soldValue90d) })
          : t('business.dealer.kpi.noSales'),
    },
    {
      key: 'days',
      label: t('business.dealer.kpi.avgDays'),
      value: s.avgDaysToSell90d == null ? '–' : Math.round(s.avgDaysToSell90d),
      hint: t('business.dealer.kpi.avgDaysHint'),
    },
  ];

  return (
    <FadeIn offset={0} style={styles.flex}>
      <ScrollView
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {top}

        <View style={[styles.card, styles.actions]}>
          <AppText variant="title" color={colors.heading}>
            {t('business.dealer.action.title')}
          </AppText>
          {actions.length > 0 ? (
            actions.map(({ key, ...row }, i) => <ActionRow key={key} {...row} divider={i > 0} />)
          ) : (
            <AppText variant="caption" style={styles.caughtUp}>
              {t('business.dealer.action.none')}
            </AppText>
          )}
        </View>

        <View style={styles.tiles}>
          {tiles.map(({ key, ...tile }) => (
            <KpiTile key={key} {...tile} style={styles.tile} />
          ))}
        </View>

        <View style={styles.charts}>
          <TitledCard title={t('business.dealer.chart.offers')} style={styles.chart}>
            <WeeklyBars weeks={data.weeks} valueKey="offersReceived" a11yLabel={t('business.dealer.chart.offers')} />
          </TitledCard>
          <TitledCard title={t('business.dealer.chart.sales')} style={styles.chart}>
            <WeeklyBars weeks={data.weeks} valueKey="salesCompleted" a11yLabel={t('business.dealer.chart.sales')} />
          </TitledCard>
        </View>
      </ScrollView>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  skeleton: {
    marginTop: spacing.md,
  },
  retry: {
    marginTop: spacing.lg,
  },
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  actions: {
    gap: spacing.xs,
  },
  caughtUp: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  tile: {
    flexBasis: TILE_BASIS,
    flexGrow: 1,
  },
  charts: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  chart: {
    flex: isTablet ? 1 : undefined,
  },
});

export default DealerOverview;
