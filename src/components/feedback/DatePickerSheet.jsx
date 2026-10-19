import { StyleSheet } from 'react-native';
import BottomSheet from './BottomSheet';
import AppText from '../common/AppText';
import DateCalendar from '../common/DateCalendar';
import { spacing } from '../../theme';
import { useT } from '../../i18n';

// Bottom sheet with a calendar. Picking a day selects it and closes the sheet.
function DatePickerSheet({ visible, title: titleProp, onClose, onSelect, ...calendarProps }) {
  const t = useT();
  const title = titleProp ?? t('common.selectDateTitle');
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <DateCalendar
        {...calendarProps}
        onSelect={date => {
          onSelect(date);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.sm,
  },
});

export default DatePickerSheet;
