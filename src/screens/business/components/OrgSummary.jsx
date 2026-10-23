import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Tag } from '../../../components';
import { spacing } from '../../../theme';
import { fs } from '../../../utils/responsive';
import { useT } from '../../../i18n';
import { labelOr, orgStatus } from '../statuses';

// The organization a portal is showing: legal name, status and type (as the
// web portal's header line).
function OrgSummary({ org, style }) {
  const t = useT();
  if (!org) {
    return null;
  }
  const status = orgStatus(org.status);
  return (
    <View style={[styles.row, style]}>
      <AppText variant="title" style={styles.name} numberOfLines={2}>
        {org.name}
      </AppText>
      <Badge label={labelOr(t, status.labelKey, org.status)} tone={status.tone} size="sm" />
      <Tag label={labelOr(t, `business.orgType.${org.type}`, org.type)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: fs(15),
    lineHeight: fs(20),
  },
});

export default OrgSummary;
