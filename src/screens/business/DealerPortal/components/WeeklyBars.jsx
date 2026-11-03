import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useLanguage, useT } from '../../../../i18n';

const HEIGHT = ms(96);
const LOCALES = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };

// "2026-10-06" -> "6 Oct" (the week's Monday).
const weekLabel = (iso, language) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(LOCALES[language] ?? 'en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
};

// 12 weeks as bars (oldest left), in the app's red, sized to the busiest week;
// an empty week is a thin grey line. The total and the first / last week's
// date sit underneath. weeks: [{ weekStart, ... }]; valueKey: which count.
function WeeklyBars({ weeks, valueKey, a11yLabel }) {
  const t = useT();
  const language = useLanguage();
  const values = weeks.map(w => w[valueKey] ?? 0);
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, v) => sum + v, 0);

  return (
    <View accessible accessibilityLabel={`${a11yLabel}: ${t('business.dealer.chart.total', { count: total })}`}>
      <View style={styles.bars}>
        {values.map((value, i) => (
          <View key={weeks[i].weekStart ?? i} style={styles.slot}>
            {value > 0 ? (
              <AppText variant="caption" style={styles.count}>
                {value}
              </AppText>
            ) : null}
            <View
              style={[
                styles.bar,
                value > 0 ? { height: Math.max(ms(4), (value / max) * (HEIGHT - ms(16))) } : styles.empty,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.axis}>
        <AppText variant="caption" style={styles.date}>
          {weeks.length ? weekLabel(weeks[0].weekStart, language) : ''}
        </AppText>
        <AppText variant="caption" color={colors.heading} style={styles.total}>
          {t('business.dealer.chart.total', { count: total })}
        </AppText>
        <AppText variant="caption" style={styles.date}>
          {weeks.length ? weekLabel(weeks[weeks.length - 1].weekStart, language) : ''}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: HEIGHT,
    gap: ms(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  count: {
    fontSize: fs(9),
    lineHeight: fs(12),
  },
  bar: {
    alignSelf: 'stretch',
    borderTopLeftRadius: ms(3),
    borderTopRightRadius: ms(3),
    backgroundColor: colors.primary,
  },
  empty: {
    height: ms(2),
    backgroundColor: colors.border,
  },
  axis: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  date: {
    fontSize: fs(10),
    lineHeight: fs(14),
  },
  total: {
    fontSize: fs(11),
    lineHeight: fs(15),
  },
});

export default WeeklyBars;
