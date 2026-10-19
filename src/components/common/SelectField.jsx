import { useState } from 'react';
import PressableField from './PressableField';
import OptionSheet from '../feedback/OptionSheet';
import { useT } from '../../i18n';

// Looks like a TextField; tapping opens a sheet to pick one option.
// options: ['Yes', 'No'] or [{ label, value }]
// title: sheet title + screen-reader label when there's no label (e.g. a long
// question shown as text above the field)
function SelectField({
  label,
  title = label,
  value,
  options,
  onChange,
  placeholder: placeholderProp,
  error,
  style,
}) {
  const t = useT();
  const placeholder = placeholderProp ?? t('common.select');
  const [open, setOpen] = useState(false);
  const selected = options
    .map(o => (typeof o === 'string' ? { label: o, value: o } : o))
    .find(o => o.value === value);

  return (
    <>
      <PressableField
        label={label}
        accessibilityLabel={title}
        displayValue={selected?.label ?? ''}
        placeholder={placeholder}
        valid={!!selected}
        error={error}
        onPress={() => setOpen(true)}
        style={style}
      />
      <OptionSheet
        visible={open}
        title={title}
        options={options}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default SelectField;
