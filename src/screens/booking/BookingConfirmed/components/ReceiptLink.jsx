import { StyleSheet, View } from 'react-native';
import { AppText, Button, Icon } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import useReceiptDownload from '../../../account/receipt/useReceiptDownload';

const TONES = { success: colors.success, error: colors.danger };

// A small "Download receipt" link (saves the receipt PDF) and its status line.
function ReceiptLink({ receipt, style }) {
  const t = useT();
  const { downloading, message, download } = useReceiptDownload(receipt);
  return (
    <View style={[styles.wrap, style]}>
      <Button
        title={t('account.receipt.download')}
        variant="ghost"
        size="sm"
        leftIcon={<Icon name="document" size={ms(16)} color={colors.primary} />}
        onPress={download}
        loading={downloading}
        disabled={!receipt}
      />
      {message ? (
        <AppText variant="caption" align="center" color={TONES[message.tone]} accessibilityLiveRegion="polite">
          {message.text}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
});

export default ReceiptLink;
