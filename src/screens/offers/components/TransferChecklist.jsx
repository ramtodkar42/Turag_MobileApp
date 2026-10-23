import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Icon, OptionSheet } from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { formatDate } from '../../../utils/format';
import { toIsoDate } from '../../../utils/date';
import { useT } from '../../../i18n';
import useTransferChecklist from './useTransferChecklist';

const STATUS_TONE = { PENDING: 'neutral', PROVIDED: 'warning', VERIFIED: 'success', WAIVED: 'neutral' };

// "1.2 MB" / "980 KB".
const humanSize = bytes => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

// The ownership-transfer documents of one order (as the web's transfer
// checklist / purchase documents), for role 'BUYER' | 'SELLER':
//   mode 'checklist': every item that applies with its status; your own items
//     can be uploaded (camera / gallery / PDF) or replaced until verified;
//     any attached document opens in the phone's viewer.
//   mode 'documents': the purchase's documents after handover (read only).
// onReadyChange(ready): whether the handover gate is met (seller).
function TransferChecklist({ orderId, role, mode = 'checklist', onReadyChange, style }) {
  const t = useT();
  const { checklist, error, busyCode, openingCode, upload, open } = useTransferChecklist(orderId, onReadyChange);
  const [sourceFor, setSourceFor] = useState(null); // item code

  const documentsOnly = mode === 'documents';
  const title = t(documentsOnly ? 'offers.transfer.documentsTitle' : 'offers.transfer.title');

  if (!checklist) {
    return (
      <View style={[styles.wrap, style]}>
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>
        {error ? (
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption">{t('offers.transfer.loading')}</AppText>
          </View>
        )}
      </View>
    );
  }

  const items = checklist.items.filter(i =>
    documentsOnly ? !!i.document : i.status !== 'NOT_APPLICABLE',
  );

  return (
    <View style={[styles.wrap, style]}>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="caption">
        {t(
          documentsOnly
            ? 'offers.transfer.documentsHint'
            : role === 'BUYER'
            ? 'offers.transfer.buyerHint'
            : 'offers.transfer.sellerHint',
        )}
      </AppText>

      {items.length === 0 ? (
        <AppText variant="caption" style={styles.empty}>
          {t(documentsOnly ? 'offers.transfer.noDocuments' : 'offers.transfer.noItems')}
        </AppText>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => {
            const mine = item.responsible === role && (item.status === 'PENDING' || item.status === 'PROVIDED');
            const busy = busyCode === item.code;
            return (
              <View key={item.code} style={[styles.item, index > 0 && styles.divider]}>
                <View style={styles.itemTop}>
                  <View style={styles.flex}>
                    <AppText style={styles.label}>{item.label}</AppText>
                    {item.document ? (
                      <View style={styles.fileRow}>
                        <Icon name="document" size={ms(12)} color={colors.body} />
                        <AppText variant="caption" numberOfLines={1} style={styles.flex}>
                          {[
                            item.document.fileName,
                            humanSize(item.document.size),
                            item.document.uploadedAt ? formatDate(toIsoDate(new Date(item.document.uploadedAt))) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  {!documentsOnly ? (
                    <Badge
                      label={t(`offers.transfer.status.${item.status}`)}
                      tone={STATUS_TONE[item.status] ?? 'neutral'}
                      size="sm"
                    />
                  ) : null}
                </View>

                {item.document || (mine && !documentsOnly) ? (
                  <View style={styles.actions}>
                    {item.document ? (
                      <Button
                        title={t('offers.transfer.open')}
                        size="sm"
                        variant="outline"
                        fullWidth={false}
                        loading={openingCode === item.code}
                        disabled={!!openingCode}
                        onPress={() => open(item)}
                      />
                    ) : null}
                    {mine && !documentsOnly ? (
                      <Button
                        title={t(busy ? 'offers.transfer.uploading' : item.document ? 'offers.transfer.replace' : 'offers.transfer.upload')}
                        size="sm"
                        variant={item.document ? 'ghost' : 'primary'}
                        fullWidth={false}
                        loading={busy}
                        disabled={!!busyCode}
                        onPress={() => setSourceFor(item.code)}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      <OptionSheet
        visible={!!sourceFor}
        title={t('offers.transfer.uploadTitle')}
        options={[
          { value: 'camera', label: t('verify.source.camera') },
          { value: 'gallery', label: t('verify.source.gallery') },
          { value: 'pdf', label: t('selfInspection.source.pdf') },
        ]}
        onSelect={source => upload(sourceFor, source)}
        onClose={() => setSourceFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  title: {
    fontSize: fs(15),
    lineHeight: fs(20),
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  empty: {
    marginTop: spacing.sm,
  },
  list: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  item: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  label: {
    fontSize: fs(13.5),
    lineHeight: fs(19),
    color: colors.heading,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

export default TransferChecklist;
