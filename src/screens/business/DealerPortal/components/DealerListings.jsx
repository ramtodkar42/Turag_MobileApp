import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { formatINR } from '../../../../utils/format';
import { formatSlotDate } from '../../../../utils/date';
import useRemoteData from '../../../../hooks/useRemoteData';
import useConfirmDialog from '../../../../hooks/useConfirmDialog';
import { getDealerListings, withdrawDealerListing } from '../../../../api/services/business.api';
import { useT } from '../../../../i18n';
import RemoteList from '../../components/RemoteList';
import RowCard from '../../components/RowCard';
import { labelOr, listingStatus, shortId } from '../../statuses';

// "My listings": the dealer org's own stock (all statuses), newest first as
// the server sends it. Withdraw asks first; the list then shows it withdrawn.
function DealerListings({ orgId, top }) {
  const t = useT();
  const remote = useRemoteData(() => getDealerListings(orgId), [orgId]);
  const { setData, reload } = remote;
  const { confirm, dialog } = useConfirmDialog();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const withdraw = useCallback(
    listing =>
      confirm({
        title: t('business.dealer.withdraw.title'),
        message: t('business.dealer.withdraw.message'),
        confirmLabel: t('business.dealer.withdraw.confirm'),
        cancelLabel: t('business.dealer.withdraw.keep'),
        onConfirm: async () => {
          setBusyId(listing.id);
          setActionError('');
          try {
            const updated = await withdrawDealerListing(orgId, listing.id);
            setData(list => list.map(l => (l.id === updated.id ? updated : l)));
          } catch (e) {
            // As the web: on failure, show what the server has now.
            setActionError(e.message || t('business.dealer.withdraw.error'));
            reload();
          } finally {
            setBusyId(null);
          }
        },
      }),
    [confirm, orgId, reload, setData, t],
  );

  const renderItem = useCallback(
    ({ item }) => {
      const status = listingStatus(item.status);
      const when = item.publishedAt ?? item.createdAt;
      return (
        <RowCard
          title={t('business.dealer.listingTitle', { id: shortId(item.id) })}
          badge={{ label: labelOr(t, status.labelKey, item.status), tone: status.tone }}
          lines={[
            `${t('business.field.city')}: ${item.city ? labelOr(t, `business.city.${item.city}`, item.city) : t('business.notSet')}`,
            when
              ? t(item.publishedAt ? 'business.dealer.liveSince' : 'business.dealer.createdOn', {
                  date: formatSlotDate(when),
                })
              : null,
          ]}
          footer={
            <View style={styles.footer}>
              <View style={styles.flex}>
                <AppText variant="caption">{t('business.field.askPrice')}</AppText>
                <AppText variant="title" color={colors.success} style={styles.price}>
                  {item.askPrice != null ? formatINR(item.askPrice) : '—'}
                </AppText>
              </View>
              {item.canWithdraw ? (
                <Button
                  title={t('business.dealer.withdraw.button')}
                  variant="outline"
                  size="sm"
                  loading={busyId === item.id}
                  disabled={busyId != null && busyId !== item.id}
                  onPress={() => withdraw(item)}
                />
              ) : null}
            </View>
          }
        />
      );
    },
    [busyId, t, withdraw],
  );

  return (
    <>
      <RemoteList
        remote={remote}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        header={
          <>
            {top}
            {actionError ? (
              <AppText variant="caption" color={colors.danger} style={styles.error}>
                {actionError}
              </AppText>
            ) : null}
          </>
        }
        empty={{ title: t('business.dealer.empty.title'), message: t('business.dealer.empty.message') }}
        errorTitle={t('business.dealer.error')}
      />
      {dialog}
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  error: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  price: {
    fontSize: fs(17),
    lineHeight: fs(23),
  },
});

export default DealerListings;
