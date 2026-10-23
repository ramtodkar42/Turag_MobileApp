import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { AppText, FadeIn } from '../../../../components';
import { colors, fonts, radius, shadows, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { LANGUAGES, setLanguage, useLanguage, useT } from '../../../../i18n';

// The language menu that drops below the language pill (the web's header
// dropdown): English / हिन्दी / मराठी, the current one highlighted in soft red.
// Drawn inside the Home screen (not a separate window), so `at` - measured
// against the same screen - always puts it right below the pill.
// at: { left, top } | null (closed). Tapping outside or Back closes it.
function LanguageMenu({ at, onClose }) {
  const t = useT();
  const current = useLanguage();

  useEffect(() => {
    if (!at) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [at, onClose]);

  if (!at) return null;

  const pick = code => {
    setLanguage(code);
    onClose();
  };

  return (
    <View style={styles.layer} pointerEvents="box-none">
      <Pressable style={styles.layer} onPress={onClose} accessibilityLabel={t('common.close')} />
      <FadeIn offset={ms(-6)} style={[styles.menu, at]}>
        <View accessibilityRole="menu" style={styles.list}>
          {LANGUAGES.map(l => {
            const selected = l.code === current;
            return (
              <Pressable
                key={l.code}
                onPress={() => pick(l.code)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                accessibilityLabel={l.nativeName === l.name ? l.name : `${l.nativeName}, ${l.name}`}
                style={({ pressed }) => [styles.item, selected && styles.itemSelected, pressed && !selected && styles.itemPressed]}
              >
                <AppText style={[styles.itemText, selected && styles.itemTextSelected]}>{l.nativeName}</AppText>
              </Pressable>
            );
          })}
        </View>
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  menu: {
    position: 'absolute',
    minWidth: ms(160),
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.lg,
  },
  list: {
    padding: spacing.xs,
    gap: ms(2),
  },
  item: {
    minHeight: ms(42),
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  itemSelected: {
    backgroundColor: colors.dangerLight,
  },
  itemPressed: {
    backgroundColor: colors.input,
  },
  itemText: {
    fontFamily: fonts.title.medium,
    fontSize: fs(14),
    lineHeight: fs(20),
    color: colors.heading,
  },
  itemTextSelected: {
    fontFamily: fonts.title.bold,
    color: colors.primary,
  },
});

export default LanguageMenu;
