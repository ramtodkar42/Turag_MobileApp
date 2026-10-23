import { useRef } from 'react';
import { View } from 'react-native';
import { LANGUAGES, useLanguage, useT } from '../../../../i18n';
import FilterPill from './FilterPill';

// The app language, first in Home's filter row - the web's header picker: a
// globe pill with the language's own name ("English" / "हिन्दी" / "मराठी").
// onPress(anchor): Home opens the menu (LanguageMenu) just below this pill
// (`anchor` is the pill's view, to measure).
function LanguagePill({ onPress }) {
  const t = useT();
  const current = useLanguage();
  const language = LANGUAGES.find(l => l.code === current) ?? LANGUAGES[0];
  const anchorRef = useRef(null);

  return (
    <View ref={anchorRef} collapsable={false}>
      <FilterPill
        icon="globe"
        label={language.nativeName}
        onPress={() => onPress?.(anchorRef.current)}
        accessibilityLabel={t('home.language.button', { language: language.nativeName })}
      />
    </View>
  );
}

export default LanguagePill;
