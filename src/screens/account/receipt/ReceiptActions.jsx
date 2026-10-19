import { StyleSheet, View } from 'react-native';
import { AppText, Button } from '../../../components';
import { colors, spacing } from '../../../theme';
import { useT } from '../../../i18n';
import useReceiptDownload from './useReceiptDownload';

const TONES = { success: colors.success, error: colors.danger };

// Under a receipt (as the web's): Download receipt and a status line
// ("Receipt saved" / an error).
function ReceiptActions({ receipt, style }) {
  const t = useT();
  const { downloading, message, download } = useReceiptDownload(receipt);
  return (
    <View style={[styles.wrap, style]}>
      {message ? (
        <AppText variant="caption" align="center" color={TONES[message.tone]} accessibilityLiveRegion="polite">
          {message.text}
        </AppText>
      ) : null}
      <Button title={t('account.receipt.download')} onPress={download} loading={downloading} disabled={!receipt} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
});

export default ReceiptActions;
