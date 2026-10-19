import { StyleSheet, View } from 'react-native';
import { AppText, Button, CheckCircle } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Right side of the Email field: red "Verify" button, or a tick + "Verified".
function EmailVerifyAction({ verified, loading, onVerify }) {
  const t = useT();
  if (verified) {
    return (
      <View style={styles.verified} accessibilityLabel={t('auth.create.emailVerified')}>
        <CheckCircle size={ms(16)} />
        <AppText variant="label" color={colors.success}>
          {t('auth.create.verified')}
        </AppText>
      </View>
    );
  }
  return <Button title={t('auth.create.verify')} size="sm" loading={loading} onPress={onVerify} />;
}

const styles = StyleSheet.create({
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});

export default EmailVerifyAction;
