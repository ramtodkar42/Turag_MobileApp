import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, TextField } from '../../../components';
import { colors, spacing } from '../../../theme';
import { ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import { HANDOVER_CODE_LENGTH, cleanHandoverCode } from '../../../api/services/handover.api';

// The buyer's side at the handover, on their order page (the web's HandoverCodeEntry,
// ADR-0097): scan the QR on the seller's phone, or type the 6-character code shown
// under it. Either opens the confirmation (vehicle, keys, documents).
// onScan(): open the scanner. onCode(code): continue with a typed code.
function HandoverCodeEntry({ onScan, onCode, style }) {
  const t = useT();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (code.length !== HANDOVER_CODE_LENGTH) {
      setError(t('handover.buyer.codeError'));
      return;
    }
    onCode(code);
  };

  return (
    <View style={[styles.wrap, style]}>
      <AppText variant="title">{t('handover.buyer.codeTitle')}</AppText>
      <AppText variant="caption" color={colors.body}>
        {t('handover.buyer.codeIntro')}
      </AppText>
      <Button
        title={t('handover.buyer.scan')}
        variant="outline"
        size="md"
        fullWidth
        leftIcon={<Icon name="camera" size={ms(18)} color={colors.primary} />}
        onPress={onScan}
      />
      <TextField
        label={t('handover.buyer.codeLabel')}
        value={code}
        onChangeText={text => {
          setCode(cleanHandoverCode(text));
          setError('');
        }}
        error={error || undefined}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={HANDOVER_CODE_LENGTH}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button title={t('handover.buyer.codeSubmit')} size="md" fullWidth onPress={submit} disabled={!code} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
});

export default HandoverCodeEntry;
