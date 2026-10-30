import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// The web sign-in's reassurance line: a green dot, "Secure session · Codes
// expire in 10 min · Data handled under the DPDP Act".
function TrustNote({ style }) {
  const t = useT();
  return (
    <View style={[styles.row, style]}>
      <View style={styles.dot} />
      <AppText variant="caption" color={colors.white} style={styles.text}>
        {t('auth.trust')}
      </AppText>
    </View>
  );
}

const DOT = ms(7);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    marginTop: ms(5),
    backgroundColor: colors.success,
  },
  text: {
    flex: 1,
    fontSize: fs(11),
    lineHeight: fs(16),
    opacity: 0.85,
  },
});

export default TrustNote;
