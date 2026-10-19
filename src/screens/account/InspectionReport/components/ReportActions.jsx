import { StyleSheet, View } from 'react-native';
import { AppText, Button, ButtonRow } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { useT } from '../../../../i18n';

// Report footer (as the web's report page): Download PDF and Share report,
// with a one-line status ("Preparing your PDF…" / an error) above them.
function ReportActions({ actions }) {
  const t = useT();
  const { downloading, sharing, message, download, share } = actions;
  return (
    <View style={styles.wrap}>
      {message ? (
        <AppText
          variant="caption"
          align="center"
          color={message.tone === 'error' ? colors.danger : colors.body}
          accessibilityLiveRegion="polite"
        >
          {message.text}
        </AppText>
      ) : null}
      <ButtonRow>
        <Button
          title={t('account.report.share.button')}
          variant="outline"
          onPress={share}
          loading={sharing}
          disabled={downloading}
          style={styles.flex}
        />
        <Button
          title={t('account.report.pdf.button')}
          onPress={download}
          loading={downloading}
          disabled={sharing}
          style={styles.flex}
        />
      </ButtonRow>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});

export default ReportActions;
