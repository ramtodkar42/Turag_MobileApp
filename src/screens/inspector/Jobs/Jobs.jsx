import { useCallback, useMemo } from 'react';
import { SectionList, StyleSheet } from 'react-native';
import {
  AppRefreshControl,
  AppText,
  Button,
  CardListSkeleton,
  FadeIn,
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

// Inspection officer home (Inspections tab), as the web's job board: the
// doorstep inspections assigned to me (assigned automatically - there's no
// accept / decline), "To do" first by time, then the rest. Refreshes when
// the tab is opened again and on pull-down.
function Jobs({ navigation }) {
  const t = useT();
  const tabBarSpace = useTabBarSpace();
  const { data, loading, refreshing, error, errorCode, refresh, reload } = useRemoteData(getInspectorJobs);

  const sections = useMemo(() => {
    const jobs = data ?? [];
    return [
      { key: 'todo', titleKey: 'inspector.jobs.toDo', data: jobs.filter(j => j.toDo) },
      { key: 'other', titleKey: 'inspector.jobs.other', data: jobs.filter(j => !j.toDo) },
    ].filter(section => section.data.length);
  }, [data]);

  const renderItem = useCallback(
    ({ item }) => (
      <JobCard job={item} onPress={job => navigation.navigate(ROUTES.JOB_DETAILS, { bookingId: job.id })} />
    ),
    [navigation],
  );

  const header = (
    <HeaderCard title={t('inspector.jobs.title')} subtitle={t('inspector.jobs.subtitle')} style={styles.header} />
  );

  let body;
  if (loading) {
    body = (
      <>
        {header}
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
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <AppText variant="title" style={styles.sectionTitle}>
              {t(section.titleKey)}
            </AppText>
          )}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <StatusView title={t('inspector.jobs.emptyTitle')} message={t('inspector.jobs.emptyMessage')} style={styles.empty} />
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
        style={[styles.ai, { bottom: tabBarSpace - spacing.sm }]}
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
  skeleton: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.xl,
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
