import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Icon, IconButton, IconTile } from '../../../../components';
import { colors, fonts, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';
import { useSignedIn } from '../../../../store/userStore';
import { hasOpenSelfInspection, useGarage } from '../../../../store/garageStore';

// Closing it hides it until the app is next opened.
let hiddenThisRun = false;

// "Pick up where you left off", first thing on Home: one light row - a short message,
// a small "View" and a close X - when the owner has an AI self-inspection still open
// (in progress, or done and waiting for its payment). The whole row opens the Garage,
// where each one waits with its Continue button. Nothing for guests, or when none is open.
// onOpenGarage(): open the Garage.
function ContinueInspectionCard({ onOpenGarage, style }) {
  const t = useT();
  const signedIn = useSignedIn();
  const garage = useGarage();
  const open = useMemo(() => garage.filter(hasOpenSelfInspection), [garage]);
  const [hidden, setHidden] = useState(hiddenThisRun);
  if (!signedIn || hidden || open.length === 0) return null;

  let message;
  if (open.length > 1) {
    message = t('home.continue.many', { count: open.length });
  } else {
    message = t(open[0].phase === 'payment_pending' ? 'home.continue.paymentPending' : 'garage.phase.resumeSelf');
  }
  const hide = () => {
    hiddenThisRun = true;
    setHidden(true);
  };

  return (
    <Pressable
      onPress={onOpenGarage}
      accessibilityRole="button"
      accessibilityLabel={message}
      accessibilityHint={t('home.continue.viewHint')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <IconTile name="car" size={ms(34)} backgroundColor={colors.white} />
      {/* Wraps onto a second line rather than being cut short (Hindi / Marathi run longer). */}
      <AppText style={styles.message}>{message}</AppText>
      {/* What a tap does: the whole row is the button. */}
      <View style={styles.view}>
        <AppText variant="label" color={colors.primary} style={styles.viewText}>
          {t('home.continue.view')}
        </AppText>
      </View>
      <IconButton
        onPress={hide}
        size={ms(28)}
        backgroundColor="transparent"
        accessibilityLabel={t('home.continue.hide')}
      >
        <Icon name="close" size={ms(14)} color={colors.placeholder} strokeWidth={2.2} />
      </IconButton>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xxs,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dangerLight,
    backgroundColor: colors.unreadTint,
  },
  pressed: {
    opacity: 0.85,
  },
  message: {
    flex: 1,
    fontFamily: fonts.title.semiBold,
    fontSize: fs(14),
    lineHeight: fs(19),
    color: colors.heading,
  },
  view: {
    height: ms(26),
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  viewText: {
    fontSize: fs(12),
    lineHeight: fs(16),
  },
});

export default ContinueInspectionCard;
