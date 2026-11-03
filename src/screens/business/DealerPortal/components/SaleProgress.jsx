import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const LOCALES = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

// A sale's four steps (as the web's dealer Sales): offer accepted, token paid,
// handed over, completed - a bar per step, filled once reached, with its
// date. A cancelled sale shows the steps it reached. sale: mapDealerSale().
function SaleProgress({ sale, language = 'en' }) {
  const t = useT();
  const steps = [
    { key: 'accepted', at: sale.createdAt },
    { key: 'tokenPaid', at: sale.tokenPaidAt },
    { key: 'handedOver', at: sale.handoverAt },
    { key: 'completed', at: sale.completedAt },
  ];
  const day = time =>
    new Date(time).toLocaleDateString(LOCALES[language] ?? 'en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    });

  return (
    <View style={styles.row} accessible accessibilityLabel={t('business.dealer.sale.progress')}>
      {steps.map(step => {
        const done = !!step.at;
        return (
          <View key={step.key} style={styles.step}>
            <View style={[styles.bar, done && styles.barDone]} />
            <AppText
              variant="caption"
              color={done ? colors.heading : colors.placeholder}
              numberOfLines={2}
              style={styles.label}
            >
              {t(`business.dealer.sale.step.${step.key}`)}
            </AppText>
            {done ? (
              <AppText variant="caption" style={styles.date}>
                {day(step.at)}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: ms(6),
    marginTop: spacing.md,
  },
  step: {
    flex: 1,
    minWidth: 0,
  },
  bar: {
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: colors.border,
  },
  barDone: {
    backgroundColor: colors.primary,
  },
  label: {
    marginTop: spacing.xs,
    fontSize: fs(11),
    lineHeight: fs(14),
  },
  date: {
    fontSize: fs(10),
    lineHeight: fs(14),
  },
});

export default SaleProgress;
