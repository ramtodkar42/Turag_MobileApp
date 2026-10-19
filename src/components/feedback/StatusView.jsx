import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import { spacing } from '../../theme';

// Centered icon + title + message.
// Used for "Account Created", "Hold On", "Publishing your listing...".
function StatusView({ icon, title, message, children, style }) {
  return (
    <View style={[styles.container, style]}>
      {icon}
      {title ? (
        <AppText variant="h3" align="center" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      {message ? (
        <AppText variant="subtitle" align="center">
          {message}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
});

export default StatusView;
