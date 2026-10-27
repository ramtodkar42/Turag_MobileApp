import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Card, CheckRow, Icon } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const ICON = ms(44);

// One way to verify, as a card: icon, title, a line about it, and its button.
// consentKey: a tick-box the user must tick first (DigiLocker's consent).
// badgeKey: a small badge by the title (e.g. "Instant").
// variant: the button's look ('primary' | 'outline').
function VerifyOptionCard({ icon, titleKey, noteKey, badgeKey, buttonKey, consentKey, variant = 'primary', loading, onPress, style }) {
  const t = useT();
  const [agreed, setAgreed] = useState(false);
  const needsConsent = !!consentKey;

  return (
    <Card style={style}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon name={icon} size={ms(22)} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <AppText variant="title" style={styles.flexShrink}>
              {t(titleKey)}
            </AppText>
            {badgeKey ? <Badge label={t(badgeKey)} tone="success" size="sm" /> : null}
          </View>
          <AppText variant="caption" style={styles.note}>
            {t(noteKey)}
          </AppText>
        </View>
      </View>

      {needsConsent ? (
        <CheckRow label={t(consentKey)} checked={agreed} onToggle={() => setAgreed(a => !a)} style={styles.consent} />
      ) : null}
      <Button
        title={t(buttonKey)}
        variant={variant}
        loading={loading}
        disabled={loading || (needsConsent && !agreed)}
        onPress={onPress}
        style={styles.button}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  flexShrink: {
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  note: {
    marginTop: spacing.xs,
  },
  consent: {
    marginTop: spacing.lg,
  },
  button: {
    marginTop: spacing.lg,
  },
});

export default VerifyOptionCard;
