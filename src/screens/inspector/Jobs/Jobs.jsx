import { useCallback, useMemo, useState } from 'react';
import { SectionList, StyleSheet } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Button,
  CardListSkeleton,
  FadeIn,
  AI_BUTTON_GAP,
  FloatingAIButton,
  HeaderCard,
  ScreenContainer,
  StatusView,
  useTabBarSpace,
} from '../../../components';
import { spacing } from '../../../theme';
import useRemoteData from '../../../hooks/useRemoteData';
import { getInspectorJobs } from '../../../api/services/inspector.api';
import { ROUTES } from '../../../navigation/routes';
import { useT } from '../../../i18n';
import JobCard from './components/JobCard';
import JobsFilterBar from './components/JobsFilterBar';
import {
  EMPTY_FILTERS,
  categoriesIn,
  citiesIn,
  filterJobs,
  groupJobs,
  hasActiveFilters,
  statusCounts,
} from './jobsFilter';

// Inspection officer home (Inspections tab), as the web's job board: the
// doorstep inspections assigned to me (assigned automatically - there's no
// accept / decline). Search, status, dates, city and vehicle type narrow the
// list; then "To do" by time, "Expired" (slot passed, never started - ops must
// reschedule) and the rest. Refreshes when the tab is opened again and on pull-down.
function Jobs({ navigation }) {
  const t = useT();
  const tabBarSpace = useTabBarSpace();
  const { data, loading, refreshing, error, errorCode, refresh, reload } = useRemoteData(getInspectorJobs);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const jobs = useMemo(() => data ?? [], [data]);
  const filtering = hasActiveFilters(filters);

  const view = useMemo(() => {
    const filtered = filterJobs(jobs, filters);
    // Expiry is checked against the clock on every load / refresh.
    const groups = groupJobs(filtered, Date.now());
    // Group counts while filtering, as the web ("To do (3)").
    const sections = filtered.length
      ? [
          {
            key: 'todo',
            title: filtering ? t('inspector.jobs.toDoCount', { count: groups.active.length }) : t('inspector.jobs.toDo'),
            data: groups.active,
          },
          { key: 'expired', title: t('inspector.jobs.expired', { count: groups.expired.length }), data: groups.expired },
          {
            key: 'other',
            title: filtering ? t('inspector.jobs.otherCount', { count: groups.done.length }) : t('inspector.jobs.other'),
            data: groups.done,
          },
        ].filter(section => section.key === 'todo' || section.data.length)
      : [];
    return {
      sections,
      shown: filtered.length,
      active: groupJobs(jobs, Date.now()).active.length,
      counts: statusCounts(jobs, filters),
      cities: citiesIn(jobs),
      categories: categoriesIn(jobs),
    };
  }, [jobs, filters, filtering, t]);

  const renderItem = useCallback(
    ({ item, section }) => (
      <JobCard
        job={item}
        expired={section.key === 'expired'}
        onPress={job => navigation.navigate(ROUTES.JOB_DETAILS, { bookingId: job.id })}
      />
    ),
    [navigation],
  );

  const renderSectionHeader = ({ section }) => (
    <>
      <AppText variant="title" style={styles.sectionTitle}>
        {section.title}
      </AppText>
      {section.key === 'expired' ? (
        <AppText variant="caption" style={styles.sectionNote}>
          {t('inspector.jobs.expiredNote')}
        </AppText>
      ) : null}
    </>
  );

  // "To do" stays as a heading when only other groups match.
  const renderSectionFooter = ({ section }) =>
    section.key === 'todo' && !section.data.length ? (
      <AppText variant="subtitle" style={styles.sectionNote}>
        {t('inspector.jobs.nothingToDo')}
      </AppText>
    ) : null;

  const header = (
    <>
      <HeaderCard title={t('inspector.jobs.title')} subtitle={t('inspector.jobs.subtitle')} style={styles.header} />
      {jobs.length ? (
        <JobsFilterBar
          filters={filters}
          onChange={patch => setFilters(current => ({ ...current, ...patch }))}
          onClear={() => setFilters(EMPTY_FILTERS)}
          counts={view.counts}
          cities={view.cities}
          categories={view.categories}
          shown={view.shown}
          total={jobs.length}
          activeCount={view.active}
          style={styles.filters}
        />
      ) : null}
    </>
  );

  let body;
  if (loading) {
    body = (
      <>
        <HeaderCard title={t('inspector.jobs.title')} subtitle={t('inspector.jobs.subtitle')} style={styles.header} />
        <CardListSkeleton cards={[3, 3]} style={styles.skeleton} />
      </>
    );
  } else if (error) {
    const forbidden = errorCode === 'FORBIDDEN';
    body = (
      <StatusView
        title={t(forbidden ? 'inspector.jobs.forbiddenTitle' : 'inspector.jobs.errorTitle')}
        message={forbidden ? t('inspector.jobs.forbiddenMessage') : error}
      >
        {forbidden ? null : <Button title={t('common.retry')} size="md" onPress={reload} style={styles.action} />}
      </StatusView>
    );
  } else {
    body = (
      <FadeIn offset={0} style={styles.flex}>
        <SectionList
          sections={view.sections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={renderSectionFooter}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={header}
          ListEmptyComponent={
            filtering ? (
              <StatusView title={t('common.filter.noMatch')} message={t('inspector.jobs.noMatchHint')} style={styles.empty}>
                <Button
                  title={t('common.filter.clear')}
                  size="md"
                  variant="outline"
                  onPress={() => setFilters(EMPTY_FILTERS)}
                  style={styles.action}
                />
              </StatusView>
            ) : (
              <StatusView title={t('inspector.jobs.emptyTitle')} message={t('inspector.jobs.emptyMessage')} style={styles.empty} />
            )
          }
          refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={{ paddingBottom: tabBarSpace }}
          showsVerticalScrollIndicator={false}
        />
      </FadeIn>
    );
  }

  return (
    <ScreenContainer>
      {body}
      <FloatingAIButton
        onPress={() => navigation.navigate(ROUTES.CHAT_SPLASH)}
        style={[styles.ai, { bottom: tabBarSpace + AI_BUTTON_GAP }]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    marginTop: spacing.xxl,
  },
  filters: {
    marginTop: spacing.lg,
  },
  skeleton: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.xl,
  },
  sectionNote: {
    marginTop: spacing.xs,
  },
  empty: {
    marginTop: spacing.xxl,
  },
  action: {
    marginTop: spacing.lg,
  },
  ai: {
    position: 'absolute',
    right: spacing.lg,
  },
});

export default Jobs;
