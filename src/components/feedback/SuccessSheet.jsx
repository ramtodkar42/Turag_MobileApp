import { StyleSheet, View } from 'react-native';
import BottomSheet from './BottomSheet';
import AppText from '../common/AppText';
import Button from '../common/Button';
import CheckCircle from '../common/CheckCircle';
import { spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// "Successful!" sheet shown after verification, offer, listing, etc.
function SuccessSheet({
  visible,
  onClose,
  title: titleProp,
  message,
  actionLabel,
  onAction,
}) {
  const t = useT();
  const title = titleProp ?? t('common.successful');
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <CheckCircle size={ms(72)} />
        <AppText variant="h3" align="center" style={styles.title}>
          {title}
        </AppText>
        {message ? (
          <AppText variant="subtitle" align="center">
            {message}
          </AppText>
        ) : null}
      </View>
      {actionLabel ? <Button title={actionLabel} onPress={onAction} /> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  title: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
});

export default SuccessSheet;
