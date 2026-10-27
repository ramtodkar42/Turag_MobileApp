import { StyleSheet, View } from 'react-native';
import {
  AppText,
  BottomSheet,
  Button,
  ButtonRow,
  FadeIn,
  Icon,
  TextField,
} from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { CONFIRM_WORD } from '../useDeleteAccount';

const ICON = ms(52);

// "Delete account" (as the web's Account page): what deleting means, then
// "Type DELETE to confirm" - "Delete permanently" works only once DELETE is
// typed. The sheet can't be closed while it's deleting.
// account: useDeleteAccount().
function DeleteAccountSheet({ account }) {
  const t = useT();
  const { open, hide, typed, setTyped, canDelete, deleting, error, remove } =
    account;

  return (
    <BottomSheet visible={open} onClose={hide} dismissible={!deleting}>
      <View style={styles.icon}>
        <Icon name="trash" size={ms(24)} color={colors.danger} />
      </View>
      <AppText variant="h3" align="center" style={styles.title}>
        {t('profile.delete.title')}
      </AppText>
      <AppText
        variant="caption"
        color={colors.body}
        align="center"
        style={styles.body}
      >
        {t('profile.delete.body')}
      </AppText>

      <TextField
        label={t('profile.delete.confirmLabel')}
        placeholder={CONFIRM_WORD}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="done"
        onSubmitEditing={remove}
        editable={!deleting}
        style={styles.field}
      />

      {error ? (
        <FadeIn offset={0} style={styles.error}>
          <Icon
            name="close"
            size={ms(14)}
            color={colors.danger}
            strokeWidth={3}
          />
          <AppText variant="caption" color={colors.danger} style={styles.flex}>
            {error}
          </AppText>
        </FadeIn>
      ) : null}

      <ButtonRow style={styles.actions}>
        <Button
          title={t('profile.delete.cancel')}
          variant="outline"
          fullWidth={false}
          disabled={deleting}
          onPress={hide}
          style={styles.flex}
        />
        <Button
          title={t(
            deleting ? 'profile.delete.deleting' : 'profile.delete.confirm',
          )}
          fullWidth={false}
          loading={deleting}
          disabled={!canDelete && !deleting}
          onPress={remove}
          style={styles.flex}
        />
      </ButtonRow>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  title: {
    marginTop: spacing.md,
  },
  body: {
    marginTop: spacing.sm,
  },
  field: {
    marginTop: spacing.lg,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  flex: {
    flex: 1,
  },
  actions: {
    marginTop: spacing.lg,
  },
});

export default DeleteAccountSheet;
