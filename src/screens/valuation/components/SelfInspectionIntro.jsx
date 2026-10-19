import { StyleSheet, View } from 'react-native';
import { AppText, Card, Icon, InfoNote } from '../../../components';
import { colors, radius, spacing } from '../../../theme';
import { fs, ms } from '../../../utils/responsive';
import { useT } from '../../../i18n';

const PARTS = [
  { icon: 'document', titleKey: 'valuation.self.partDocs', textKey: 'valuation.self.partDocsText' },
  { icon: 'camera', titleKey: 'valuation.self.partPhotos', textKey: 'valuation.self.partPhotosText' },
  { icon: 'shieldCheck', titleKey: 'valuation.self.partChecks', textKey: 'valuation.self.partChecksText' },
];

// "Inspect it yourself": what the step-by-step checklist covers before it starts.
function SelfInspectionIntro({ style }) {
  const t = useT();
  return (
    <View style={style}>
      <Card style={styles.card}>
        {PARTS.map(part => (
          <View key={part.icon} style={styles.row}>
            <View style={styles.icon}>
              <Icon name={part.icon} size={ms(18)} color={colors.primary} />
            </View>
            <View style={styles.text}>
              <AppText variant="title" style={styles.title}>
                {t(part.titleKey)}
              </AppText>
              <AppText variant="caption">{t(part.textKey)}</AppText>
            </View>
          </View>
        ))}
      </Card>
      <InfoNote style={styles.note}>{t('valuation.self.introNote')}</InfoNote>
    </View>
  );
}

const ICON = ms(36);

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: fs(14),
    lineHeight: fs(19),
  },
  note: {
    marginTop: spacing.md,
  },
});

export default SelfInspectionIntro;
