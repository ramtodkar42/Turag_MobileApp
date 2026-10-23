import { StyleSheet } from 'react-native';
import AppText from './AppText';
import CheckRow from './CheckRow';
import { colors } from '../../theme';
import { useT } from '../../i18n';

// DPDP inspection consent for a self-inspection (as the web's
// InspectionConsentCheckbox; Privacy Policy section 6.4): shown wherever a
// self-inspection starts, its button stays off until this is ticked, and the
// ticked value is what's sent - never a fixed "yes".
// onOpenPolicy: opens the Privacy Policy (the underlined words).
function InspectionConsent({ checked, onToggle, onOpenPolicy, style }) {
  const t = useT();
  return (
    <CheckRow
      checked={checked}
      onToggle={onToggle}
      style={style}
      label={
        <>
          {t('consent.inspection.prefix')}
          <AppText variant="caption" color={colors.primary} onPress={onOpenPolicy} style={styles.link}>
            {t('consent.inspection.link')}
          </AppText>
          {t('consent.inspection.suffix')}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
  },
});

export default InspectionConsent;
