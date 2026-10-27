import { StyleSheet, View } from 'react-native';
import { Button, Icon, StatusView } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const BADGE = ms(72);

// How each outcome looks (as the web's DigiLocker return page).
const OUTCOME = {
  APPROVED: { icon: 'check', color: colors.success, bg: colors.successLight, key: 'approved' },
  INITIATED: { icon: 'timer', color: colors.warning, bg: colors.warningLight, key: 'waiting' },
  EXPIRED: { icon: 'clock', color: colors.muted, bg: colors.input, key: 'expired' },
  FAILED: { icon: 'close', color: colors.danger, bg: colors.dangerLight, key: 'failed' },
};

// The end of the DigiLocker journey: verified, still waiting ("Check again"),
// timed out or not completed ("Try again"). onDone: back to the status page.
function DigiLockerResult({ verification, onDone, onCheckAgain, onTryAgain }) {
  const t = useT();
  const outcome = OUTCOME[verification.status] ?? OUTCOME.FAILED;

  return (
    <StatusView
      icon={
        <View style={[styles.badge, { backgroundColor: outcome.bg }]}>
          <Icon name={outcome.icon} size={ms(34)} color={outcome.color} strokeWidth={2.5} />
        </View>
      }
      title={t(`verify.dl.result.${outcome.key}.title`)}
      message={t(`verify.dl.result.${outcome.key}.body`, { doc: verification.docMasked })}
    >
      <View style={styles.actions}>
        {verification.status === 'INITIATED' ? (
          <Button title={t('verify.dl.checkAgain')} onPress={onCheckAgain} />
        ) : null}
        {verification.status === 'FAILED' || verification.status === 'EXPIRED' ? (
          <Button title={t('verify.dl.again')} onPress={onTryAgain} />
        ) : null}
        <Button
          title={t('common.done')}
          variant={verification.status === 'APPROVED' ? 'primary' : 'outline'}
          onPress={onDone}
        />
      </View>
    </StatusView>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
});

export default DigiLockerResult;
