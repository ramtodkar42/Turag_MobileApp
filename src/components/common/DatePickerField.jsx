import { useState } from 'react';
import PressableField from './PressableField';
import DatePickerSheet from '../feedback/DatePickerSheet';
import { formatDateNumeric } from '../../utils/format';
import { useT } from '../../i18n';

// Date field: shows "25/10/2026"; tapping opens a calendar sheet.
// value / onChange use ISO dates ("2026-10-25").
// Optional: minDate, maxDate, availableDates (only these can be picked).
function DatePickerField({
  label,
  value,
  onChange,
  placeholder: placeholderProp,
  error,
  style,
  ...calendarProps
}) {
  const t = useT();
  const placeholder = placeholderProp ?? t('common.selectDate');
  const [open, setOpen] = useState(false);

  return (
    <>
      <PressableField
        label={label}
        displayValue={value ? formatDateNumeric(value) : ''}
        placeholder={placeholder}
        valid={!!value}
        error={error}
        onPress={() => setOpen(true)}
        style={style}
      />
      <DatePickerSheet
        visible={open}
        title={label}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
        {...calendarProps}
      />
    </>
  );
}

export default DatePickerField;
