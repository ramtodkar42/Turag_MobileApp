import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import Card from '../common/Card';
import Icon from '../icons/Icon';
import { colors, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';
import { useT } from '../../i18n';

// Green price card: "Pre-Estimated Value ↗  ₹8,31,300/-" + vehicle name + note.
function ValueCard({ label: labelProp, value, title, description, style }) {
  const t = useT();
  const label = labelProp ?? t('common.preEstimatedValue');
  return (
    <Card style={style}>
      <View style={styles.labelRow}>
        <AppText variant="caption" color={colors.heading} style={styles.label}>
          {label}
        </AppText>
        <Icon name="trendUp" size={ms(12)} color={colors.heading} strokeWidth={2} />
      </View>
      <AppText variant="h1" color={colors.success} style={styles.value}>
        {value}
      </AppText>
      {title ? (
        <AppText variant="h3" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      {description ? (
        <AppText variant="subtitle" style={styles.description}>
          {description}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fs(11),
  },
  value: {
    marginVertical: spacing.xs,
    fontSize: fs(26),
    lineHeight: fs(34),
  },
  title: {
    marginTop: spacing.sm,
    fontSize: fs(17),
    lineHeight: fs(23),
  },
  description: {
    marginTop: spacing.xxs,
    fontSize: fs(12),
    lineHeight: fs(17),
  },
});

export default ValueCard;
