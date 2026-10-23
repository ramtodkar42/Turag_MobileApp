import { FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppRefreshControl, Button, CardListSkeleton, FadeIn, StatusView } from '../../../components';
import { spacing } from '../../../theme';
import { useT } from '../../../i18n';

// The Business screens' list body, in the app's usual states: grey cards on
// the first load, an error with Retry, the list with pull-to-refresh, and an
// empty message.
// remote: useRemoteData() result; items: the rows (defaults to remote.data)
// empty: { title, message, action? };  errorTitle: the failed-load title
// header / footer: list header / footer (e.g. filters, "Load more")
function RemoteList({ remote, items, renderItem, keyExtractor, header, footer, empty, errorTitle, skeleton = [3, 3, 3] }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { loading, error, refreshing, refresh, reload } = remote;

  if (loading) {
    return (
      <>
        {header}
        <CardListSkeleton cards={skeleton} style={styles.skeleton} />
      </>
    );
  }
  if (error) {
    return (
      <>
        {header}
        <StatusView title={errorTitle} message={error}>
          <Button title={t('common.retry')} size="md" onPress={reload} style={styles.action} />
        </StatusView>
      </>
    );
  }
  return (
    <FadeIn offset={0} style={styles.flex}>
      <FlatList
        data={items ?? remote.data ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <StatusView title={empty.title} message={empty.message} style={styles.empty}>
            {empty.action}
          </StatusView>
        }
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }}
        showsVerticalScrollIndicator={false}
      />
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
  empty: {
    marginTop: spacing.xxl,
  },
  action: {
    marginTop: spacing.lg,
  },
});

export default RemoteList;
