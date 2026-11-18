import { StyleSheet, View } from 'react-native';
import { AppText, ChoiceChip, TextField } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { useT } from '../../../../i18n';

const CODE_MAX = 16;

// For a dealer signing up (the web's ADR-0089): "Do you have a referral code?" Yes / No;
// Yes asks for the 7-character code from the Turag executive who told them about us.
// hasReferral (bool), code, onHasReferral(bool), onCode(text), error.
function ReferralField({ hasReferral, code, onHasReferral, onCode, error, style }) {
  const t = useT();
  return (
    <View style={style}>
      <AppText variant="title">{t('auth.referral.question')}</AppText>
      <View style={styles.choices} accessibilityRole="radiogroup">
        <ChoiceChip
          label={t('auth.referral.yes')}
          selected={hasReferral}
          onPress={() => onHasReferral(true)}
          style={styles.choice}
        />
        <ChoiceChip
          label={t('auth.referral.no')}
          selected={!hasReferral}
          onPress={() => onHasReferral(false)}
          style={styles.choice}
        />
      </View>
      {hasReferral ? (
        <View style={styles.field}>
          <TextField
            label={t('auth.referral.label')}
            value={code}
            onChangeText={text => onCode(text.toUpperCase().replace(/\s+/g, ''))}
            error={error || undefined}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={CODE_MAX}
            returnKeyType="done"
          />
          <AppText variant="caption" color={colors.body}>
            {t('auth.referral.hint')}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  choices: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  choice: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  field: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});

export default ReferralField;
