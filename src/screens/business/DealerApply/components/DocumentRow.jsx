import { StyleSheet, View } from 'react-native';
import { AppText, Button } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { useT } from '../../../../i18n';

// One KYC document of the dealer application: its name, where it stands (not
// uploaded / waiting for review / verified / rejected with the reason) and
// Upload (or Replace). document: from the application, or null.
function DocumentRow({ label, document, disabled, loading, onUpload, showDivider }) {
  const t = useT();
  let status = t('dealerApply.doc.notUploaded');
  let color = colors.placeholder;
  if (document?.decision === 'VERIFIED') {
    status = t('dealerApply.doc.verified');
    color = colors.success;
  } else if (document?.decision === 'REJECTED') {
    status = document.decisionReason
      ? t('dealerApply.doc.rejectedWhy', { reason: document.decisionReason })
      : t('dealerApply.doc.rejected');
    color = colors.danger;
  } else if (document) {
    status = t('dealerApply.doc.uploaded');
    color = colors.body;
  }

  return (
    <View style={[styles.row, showDivider && styles.divider]}>
      <View style={styles.text}>
        <AppText variant="label" color={colors.heading}>
          {label}
        </AppText>
        <AppText variant="caption" color={color} style={styles.status}>
          {status}
        </AppText>
      </View>
      <Button
        title={t(document ? 'dealerApply.doc.replace' : 'dealerApply.doc.upload')}
        variant="outline"
        size="sm"
        fullWidth={false}
        onPress={onUpload}
        disabled={disabled}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  text: {
    flex: 1,
  },
  status: {
    marginTop: 2,
  },
});

export default DocumentRow;
