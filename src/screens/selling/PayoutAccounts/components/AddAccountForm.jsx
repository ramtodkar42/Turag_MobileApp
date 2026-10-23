import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Icon, TextField } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { fs, isTablet, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

// Two fields side by side on tablets, stacked on phones.
function FieldPair({ children }) {
  return <View style={isTablet ? styles.pair : null}>{children}</View>;
}

// "Add a bank account" (as the web's form): holder, bank, IFSC, the account
// number twice, the proof file, and "Submit for verification".
// form: from useAddAccountForm; onChooseFile(): opens the camera / gallery / PDF sheet.
function AddAccountForm({ form, onChooseFile, style }) {
  const t = useT();
  const { values, setters, file, busy, error, submit } = form;
  const fieldStyle = isTablet ? styles.half : null;

  return (
    <Card style={[styles.card, style]}>
      <AppText variant="title" style={styles.title}>
        {t('payouts.form.title')}
      </AppText>
      <AppText variant="caption" style={styles.intro}>
        {t('payouts.form.intro')}
      </AppText>

      <FieldPair>
        <TextField
          label={t('payouts.form.holder')}
          value={values.holder}
          onChangeText={setters.setHolder}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="words"
          maxLength={100}
          style={fieldStyle}
        />
        <TextField
          label={t('payouts.form.bank')}
          value={values.bank}
          onChangeText={setters.setBank}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="words"
          maxLength={100}
          style={fieldStyle}
        />
      </FieldPair>

      <View style={fieldStyle}>
        <TextField
          label={t('payouts.form.ifsc')}
          value={values.ifsc}
          onChangeText={setters.setIfsc}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="characters"
          maxLength={11}
        />
        <AppText variant="caption" style={styles.hint}>
          {t('payouts.form.ifscHint')}
        </AppText>
      </View>

      <FieldPair>
        <TextField
          label={t('payouts.form.number')}
          value={values.number}
          onChangeText={setters.setNumber}
          keyboardType="number-pad"
          autoComplete="off"
          autoCorrect={false}
          maxLength={40}
          style={fieldStyle}
        />
        <TextField
          label={t('payouts.form.confirm')}
          value={values.confirm}
          onChangeText={setters.setConfirm}
          keyboardType="number-pad"
          autoComplete="off"
          autoCorrect={false}
          maxLength={40}
          style={fieldStyle}
        />
      </FieldPair>

      <AppText variant="label" style={styles.proofLabel}>
        {t('payouts.form.proof')}
      </AppText>
      <View style={styles.proofRow}>
        <Icon name="document" size={ms(16)} color={file ? colors.heading : colors.placeholder} />
        <AppText
          variant="caption"
          color={file ? colors.heading : colors.placeholder}
          numberOfLines={1}
          style={styles.flex}
        >
          {file ? file.fileName || t('payouts.form.proof') : t('payouts.form.noFile')}
        </AppText>
        <Button
          title={t(file ? 'payouts.form.changeFile' : 'payouts.form.chooseFile')}
          size="sm"
          variant="outline"
          fullWidth={false}
          disabled={busy}
          onPress={onChooseFile}
        />
      </View>

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      <Button
        title={t(busy ? 'payouts.form.submitting' : 'payouts.form.submit')}
        size="md"
        disabled={busy}
        onPress={submit}
        style={styles.submit}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  title: {
    fontSize: fs(17),
    lineHeight: fs(23),
  },
  intro: {
    marginBottom: spacing.xs,
  },
  pair: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  hint: {
    marginTop: spacing.xxs,
    marginLeft: spacing.lg,
  },
  proofLabel: {
    marginTop: spacing.sm,
    color: colors.body,
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.input,
  },
  flex: {
    flex: 1,
  },
  error: {
    marginTop: spacing.xs,
  },
  submit: {
    marginTop: spacing.sm,
  },
});

export default AddAccountForm;
