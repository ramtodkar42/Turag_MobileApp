import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
// Import only the month calendar (not the package root) to keep the bundle small.
import Calendar from 'react-native-calendars/src/calendar';
import AppText from './AppText';
import Chevron from './Chevron';
import ChoiceChip from './ChoiceChip';
import { colors, fonts, radius, spacing } from '../../theme';
import { fs, ms } from '../../utils/responsive';
import { toIsoDate } from '../../utils/date';
import { useT } from '../../i18n';
import { HIT_SLOP } from '../../constants/layout';

const theme = {
  calendarBackground: colors.white,
  monthTextColor: colors.heading,
  textMonthFontFamily: fonts.title.bold,
  textMonthFontSize: fs(16),
  textSectionTitleColor: colors.placeholder,
  textDayHeaderFontFamily: fonts.subtitle.medium,
  textDayHeaderFontSize: fs(12),
  dayTextColor: colors.heading,
  textDayFontFamily: fonts.subtitle.medium,
  textDayFontSize: fs(14),
  textDisabledColor: colors.border,
  todayTextColor: colors.primary,
  selectedDayBackgroundColor: colors.primary,
  selectedDayTextColor: colors.white,
  arrowColor: colors.heading,
};

const renderArrow = direction => (
  <View style={styles.arrow}>
    <Chevron direction={direction} size={ms(7)} thickness={1.6} />
  </View>
);

const yearOf = date => Number(date.slice(0, 4));

// Keeps an ISO date between min and max (ISO dates compare as plain strings).
const clamp = (date, minDate, maxDate) => {
  if (minDate && date < minDate) {
    return minDate;
  }
  if (maxDate && date > maxDate) {
    return maxDate;
  }
  return date;
};

// The month shown first: the picked date, else the first open date, else today
// (kept between min and max). Not minDate: that can be years back.
const openingDate = (value, availableDates, minDate, maxDate) =>
  value ?? availableDates?.[0] ?? clamp(toIsoDate(new Date()), minDate, maxDate);

// Month calendar in the app theme. Only dates in `availableDates` (when given)
// and between min/max are tappable; the rest are greyed out.
// When min and max are in different years (a past date, like the last service),
// tapping the month title opens a year list, so the year changes in one tap.
function DateCalendar({ value, onSelect, minDate = toIsoDate(new Date()), maxDate, availableDates }) {
  const t = useT();
  // The month the calendar opens on; set again after a year is picked.
  const [shown, setShown] = useState(() => openingDate(value, availableDates, minDate, maxDate));
  // The month on screen now (the arrows and swipes move it).
  const [onScreen, setOnScreen] = useState(shown);
  const [pickingYear, setPickingYear] = useState(false);

  const years = useMemo(() => {
    if (!maxDate || availableDates) {
      return null;
    }
    const first = yearOf(minDate);
    const last = yearOf(maxDate);
    if (last <= first) {
      return null;
    }
    // Newest first: the recent years are the likely ones.
    return Array.from({ length: last - first + 1 }, (_, i) => last - i);
  }, [minDate, maxDate, availableDates]);

  const markedDates = useMemo(() => {
    const marks = {};
    availableDates?.forEach(date => {
      marks[date] = { disabled: false, disableTouchEvent: false };
    });
    if (value) {
      marks[value] = { ...marks[value], selected: true };
    }
    return marks;
  }, [availableDates, value]);

  // Same month in the picked year (kept between min and max).
  const pickYear = year => {
    const date = clamp(`${year}-${onScreen.slice(5, 7)}-01`, minDate, maxDate);
    setShown(date);
    setOnScreen(date);
    setPickingYear(false);
  };

  const renderTitle = month => {
    const title = month.toString('MMMM yyyy');
    return (
      <Pressable
        onPress={() => setPickingYear(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${t('common.pickYear')}`}
        hitSlop={HIT_SLOP}
        style={styles.titleButton}
      >
        <AppText style={styles.title}>{title}</AppText>
        <Chevron direction="down" size={ms(6)} thickness={1.6} style={styles.titleChevronDown} />
      </Pressable>
    );
  };

  if (pickingYear) {
    const onScreenYear = yearOf(onScreen);
    return (
      <View>
        <Pressable
          onPress={() => setPickingYear(false)}
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          style={[styles.titleButton, styles.yearHeader]}
        >
          <AppText style={styles.title}>{t('common.pickYear')}</AppText>
          <Chevron direction="up" size={ms(6)} thickness={1.6} style={styles.titleChevronUp} />
        </Pressable>
        <ScrollView style={styles.years} contentContainerStyle={styles.yearGrid}>
          {years.map(year => (
            <View key={year} style={styles.yearCell}>
              <ChoiceChip
                label={String(year)}
                selected={year === onScreenYear}
                onPress={() => pickYear(year)}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <Calendar
      key={shown}
      current={shown}
      minDate={minDate}
      maxDate={maxDate}
      markedDates={markedDates}
      disabledByDefault={!!availableDates}
      disableAllTouchEventsForDisabledDays
      onDayPress={day => onSelect(day.dateString)}
      onMonthChange={month => setOnScreen(month.dateString)}
      renderArrow={renderArrow}
      renderHeader={years ? renderTitle : undefined}
      hideExtraDays
      enableSwipeMonths
      firstDay={1}
      theme={theme}
    />
  );
}

const ARROW = ms(32);

const styles = StyleSheet.create({
  arrow: {
    width: ARROW,
    height: ARROW,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.input,
  },
  titleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontFamily: fonts.title.bold,
    fontSize: fs(16),
    color: colors.heading,
  },
  // A rotated border chevron sits off-centre; nudge it onto the text's middle.
  titleChevronDown: {
    marginLeft: spacing.sm,
    marginTop: -ms(3),
  },
  titleChevronUp: {
    marginLeft: spacing.sm,
    marginTop: ms(3),
  },
  yearHeader: {
    minHeight: ARROW,
    marginVertical: spacing.sm,
  },
  years: {
    maxHeight: ms(300),
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: spacing.sm,
  },
  yearCell: {
    width: '25%',
    padding: spacing.xs,
  },
});

export default DateCalendar;
