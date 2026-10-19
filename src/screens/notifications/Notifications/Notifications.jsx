import { useCallback, useRef } from 'react';
import { ScrollView, SectionList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppRefreshControl,
  AppText,
  Button,
  Chip,
  FadeIn,
  Header,
  ScreenContainer,
  StatusView,
} from '../../../components';
import { spacing } from '../../../theme';
import NotificationItem from './components/NotificationItem';
import NotificationSkeleton from './components/NotificationSkeleton';
import { FILTERS } from './constants';
import useNotifications from './useNotifications';
import notificationTarget from '../notificationTarget';
import { useT } from '../../../i18n';

// Notifications (bell on Home), from GET /notifications: filter chips, then
// Today / This week / Earlier.
// First visit: grey placeholder rows. Later visits: the kept list at once,
// refreshed quietly; new ones fade in at the top. Pull down to refresh.
function Notifications({ navigation }) {
  const t = useT();
  const list = useNotifications();
  const insets = useSafeAreaInsets();
  // Fade the list in only when it replaces the placeholders, not on every visit.
  const showedSkeleton = useRef(false);

  // Tapping opens the notification's page when the app has one (its link).
  const renderItem = useCallback(
    ({ item }) => {
      const target = notificationTarget(item.link);
      const row = (
        <NotificationItem
          item={item}
          onPress={target ? () => navigation.navigate(target.route, target.params) : undefined}
        />
      );
      return item.isNew ? <FadeIn>{row}</FadeIn> : row;
    },
    [navigation],
  );

  const renderSectionHeader = useCallback(
    ({ section }) => (
      <AppText variant="title" style={styles.sectionTitle}>
        {t(section.titleKey)}
      </AppText>
    ),
    [t],
  );

  const renderBody = () => {
    if (!list.loaded && list.error) {
      return (
        <StatusView title={t('notifications.error.title')} message={list.error} style={styles.status}>
          <Button title={t('common.retry')} size="sm" onPress={() => list.retry()} style={styles.retry} />
        </StatusView>
      );
    }
    if (!list.loaded) {
      showedSkeleton.current = true;
      return <NotificationSkeleton />;
    }

    const sectionList = (
      <SectionList
        sections={list.sections}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <StatusView
            title={t(`${list.emptyKey}.title`)}
            message={t(`${list.emptyKey}.message`)}
            style={styles.status}
          />
        }
        refreshControl={<AppRefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        windowSize={7}
      />
    );
    return showedSkeleton.current ? (
      <FadeIn offset={0} style={styles.flex}>
        {sectionList}
      </FadeIn>
    ) : (
      sectionList
    );
  };

  return (
    <ScreenContainer header={<Header onBack={navigation.goBack} title={t('notifications.title')} />}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsBar}
      >
        {FILTERS.map(f => (
          <Chip
            key={f.id}
            label={t(f.labelKey)}
            selected={list.filter === f.id}
            onPress={() => list.setFilter(f.id)}
          />
        ))}
      </ScrollView>

      {renderBody()}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  chipsBar: {
    flexGrow: 0,
    marginTop: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginTop: spacing.xl,
  },
  status: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  retry: {
    marginTop: spacing.lg,
  },
});

export default Notifications;
