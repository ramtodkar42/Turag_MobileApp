import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
// Import only the month calendar (not the package root) to keep the bundle small.
import Calendar from 'react-native-calendars/src/calendar';
import Chevron from './Chevron';
import { colors, fonts, radius } from '../../theme';
import { fs, ms } from '../../utils/responsive';
import { toIsoDate } from '../../utils/date';

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

// Month calendar in the app theme. Only dates in `availableDates` (when given)
// and between min/max are tappable; the rest are greyed out.
function DateCalendar({ value, onSelect, minDate = toIsoDate(new Date()), maxDate, availableDates }) {
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

  return (
    <Calendar
      current={value ?? availableDates?.[0] ?? minDate}
      minDate={minDate}
      maxDate={maxDate}
      markedDates={markedDates}
      disabledByDefault={!!availableDates}
      disableAllTouchEventsForDisabledDays
      onDayPress={day => onSelect(day.dateString)}
      renderArrow={renderArrow}
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
});

export default DateCalendar;
