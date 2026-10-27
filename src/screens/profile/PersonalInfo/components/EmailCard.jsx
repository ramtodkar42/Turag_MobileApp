import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, ButtonRow, Card, FadeIn, Icon, TextField } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const ICON = ms(40);

// The account's email (as the web's Account page): the address with a
// Verified / Unverified badge; unverified - "Resend link"; "Change" (or "Add
// email") opens a field to save a new one (a link is emailed to confirm it).
// email / verified: from the account; mail: useEmail().
function EmailCard({ email, verified, mail, style }) {
  const t = useT();
  const { busy, notice, error, editing, draft, setDraft, startEdit, cancelEdit, resend, save } = mail;

  return (
    <Card style={style}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon name="message" size={ms(18)} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="caption">{t('auth.create.email')}</AppText>
          <AppText variant="label" color={email ? colors.heading : colors.placeholder} numberOfLines={1}>
            {email || t('profile.email.none')}
          </AppText>
        </View>
        {email ? (
          <Badge
            label={t(verified ? 'profile.email.verified' : 'profile.email.unverified')}
            tone={verified ? 'success' : 'warning'}
            size="sm"
          />
        ) : null}
      </View>

      {editing ? (
        <FadeIn offset={0}>
          <TextField
            value={draft}
            onChangeText={setDraft}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={save}
            error={error}
            style={styles.field}
          />
          <ButtonRow style={styles.actions}>
            <Button
              title={t('common.cancel')}
              variant="outline"
              size="sm"
              fullWidth={false}
              disabled={busy === 'save'}
              onPress={cancelEdit}
              style={styles.flex}
            />
            <Button
              title={t('profile.email.sendLink')}
              size="sm"
              fullWidth={false}
              loading={busy === 'save'}
              onPress={save}
              style={styles.flex}
            />
          </ButtonRow>
        </FadeIn>
      ) : (
        <>
          {email && !verified ? (
            <AppText variant="caption" color={colors.body} style={styles.hint}>
              {t('profile.email.unverifiedNote')}
            </AppText>
          ) : null}
          <View style={styles.links}>
            {email && !verified ? (
              <Pressable onPress={resend} disabled={!!busy} accessibilityRole="button" hitSlop={ms(6)}>
                <AppText variant="label" color={busy ? colors.placeholder : colors.primary}>
                  {t(busy === 'resend' ? 'profile.email.sending' : 'profile.email.resend')}
                </AppText>
              </Pressable>
            ) : null}
            <Pressable onPress={startEdit} disabled={!!busy} accessibilityRole="button" hitSlop={ms(6)}>
              <AppText variant="label" color={busy ? colors.placeholder : colors.primary}>
                {t(email ? 'profile.email.change' : 'profile.email.add')}
              </AppText>
            </Pressable>
          </View>
        </>
      )}

      {notice ? (
        <FadeIn offset={0} style={styles.notice}>
          <Icon name="check" size={ms(14)} color={colors.success} strokeWidth={3} />
          <AppText variant="caption" color={colors.heading} style={styles.flex}>
            {notice}
          </AppText>
        </FadeIn>
      ) : null}
      {!editing && error ? (
        <AppText variant="caption" color={colors.danger} style={styles.hint}>
          {error}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
  },
  flex: {
    flex: 1,
  },
  field: {
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.md,
  },
  hint: {
    marginTop: spacing.md,
  },
  links: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
  },
});

export default EmailCard;
