import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import Button from '../common/Button';
import Icon from '../icons/Icon';
import useAppStoreUpdate from '../../hooks/useAppStoreUpdate';
import { colors, spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';
import BottomSheet from './BottomSheet';

const ICON = ms(52);

// iPhone: a newer version is on the App Store. Update opens its page there.
function AppStoreUpdatePrompt() {
  const t = useT();
  const { open, dismiss, update } = useAppStoreUpdate();

  return (
    <BottomSheet visible={open} onClose={dismiss}>
      <View style={styles.icon}>
        <Icon name="arrowUp" size={ms(24)} color={colors.primary} />
      </View>
      <AppText variant="h3" align="center" style={styles.title}>
        {t('common.updateAvailableTitle')}
      </AppText>
      <AppText variant="subtitle" align="center" style={styles.body}>
        {t('common.updateAvailableBody')}
      </AppText>
      <View style={styles.actions}>
        <Button title={t('common.updateNow')} onPress={update} />
        <Button title={t('common.updateLater')} variant="outline" onPress={dismiss} />
      </View>
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
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
});

export default AppStoreUpdatePrompt;
