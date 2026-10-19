import { StyleSheet } from 'react-native';
import { AppText } from '../../../../components';
import { colors, fonts } from '../../../../theme';
import { useT } from '../../../../i18n';

// "By continuing, I confirm I'm 18 or older and agree to Turag's Terms of service
// and Privacy Policy." (The backend requires the age confirmation to sign in.)
function TermsNote({ onTerms, onPrivacy, style }) {
  const t = useT();
  return (
    <AppText variant="caption" align="center" color={colors.white} style={style}>
      {t('auth.terms.prefix')}{' '}
      <AppText variant="caption" color={colors.white} style={styles.link} onPress={onTerms}>
        {t('auth.terms.link')}
      </AppText>{' '}
      {t('auth.terms.and')}{' '}
      <AppText variant="caption" color={colors.white} style={styles.link} onPress={onPrivacy}>
        {t('auth.terms.privacy')}
      </AppText>
    </AppText>
  );
}

const styles = StyleSheet.create({
  link: {
    fontFamily: fonts.subtitle.medium,
    textDecorationLine: 'underline',
  },
});

export default TermsNote;
