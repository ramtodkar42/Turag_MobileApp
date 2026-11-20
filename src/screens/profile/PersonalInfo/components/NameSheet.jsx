import { StyleSheet } from 'react-native';
import { AppText, BottomSheet, Button, ButtonRow, TextField } from '../../../../components';
import { spacing } from '../../../../theme';
import { fs } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { NAME_MAX } from '../useName';

// "Edit name" sheet in Personal Information: the name field, Cancel and Save.
// name: useName().
function NameSheet({ name }) {
  const t = useT();
  const { open, close, draft, setDraft, error, saving, save } = name;

  return (
    <BottomSheet visible={open} onClose={saving ? undefined : close}>
      <AppText variant="h3" style={styles.title}>
        {t('profile.name.edit')}
      </AppText>
      <TextField
        label={t('auth.create.name')}
        placeholder={t('auth.create.namePlaceholder')}
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
        maxLength={NAME_MAX}
        returnKeyType="done"
        onSubmitEditing={save}
        autoFocus
        error={error}
        style={styles.field}
      />
      <ButtonRow style={styles.buttons}>
        <Button title={t('common.cancel')} variant="outline" onPress={close} disabled={saving} style={styles.flex} />
        <Button title={t('common.save')} onPress={save} disabled={!draft.trim()} loading={saving} style={styles.flex} />
      </ButtonRow>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  field: {
    marginTop: spacing.lg,
  },
  buttons: {
    marginTop: spacing.xl,
  },
  flex: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
});

export default NameSheet;
