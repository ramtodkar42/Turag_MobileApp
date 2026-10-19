import { StyleSheet, View } from 'react-native';
import { AppText, CheckRow } from '../../../../components';
import { colors, spacing } from '../../../../theme';
import { useT } from '../../../../i18n';

// Terms & Conditions: one CheckRow per consent; the linked words open the page.
function ConsentList({ items, values, onToggle, onOpenLink, error, style }) {
  const t = useT();
  return (
    <View style={style}>
      <AppText variant="title">{t('auth.terms.title')}</AppText>
      <View style={styles.list}>
        {items.map(item => (
          <CheckRow
            key={item.key}
            checked={values[item.key]}
            onToggle={onToggle(item.key)}
            label={
              <>
                {t(item.prefixKey)}
                {item.linkKey ? (
                  <AppText
                    variant="caption"
                    color={colors.primary}
                    onPress={() => onOpenLink(t(item.linkKey))}
                    style={styles.link}
                  >
                    {t(item.linkKey)}
                  </AppText>
                ) : null}
                {item.suffixKey ? t(item.suffixKey) : null}
              </>
            }
          />
        ))}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  link: {
    textDecorationLine: 'underline',
  },
  error: {
    marginTop: spacing.sm,
  },
});

export default ConsentList;
