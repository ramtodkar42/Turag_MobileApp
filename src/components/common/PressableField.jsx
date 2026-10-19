import { Keyboard, Pressable, View } from 'react-native';
import TextField from './TextField';
import { useT } from '../../i18n';

// Looks exactly like a TextField but acts as a button (opens a picker/sheet).
// Shared by SelectField and DatePickerField.
// Closes the keyboard first: otherwise, on Android, the first tap inside the
// sheet only dismisses the keyboard and the option isn't selected.
function PressableField({
  label,
  accessibilityLabel = label,
  displayValue,
  placeholder,
  valid,
  error,
  onPress,
  style,
}) {
  const t = useT();
  return (
    <Pressable
      onPress={() => {
        Keyboard.dismiss();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: displayValue || t('common.notSelected') }}
      style={style}
    >
      {/* The field only displays the value; the Pressable handles the tap. */}
      <View pointerEvents="none">
        <TextField
          label={label}
          value={displayValue}
          placeholder={placeholder}
          valid={valid}
          error={error}
          readOnly
        />
      </View>
    </Pressable>
  );
}

export default PressableField;
