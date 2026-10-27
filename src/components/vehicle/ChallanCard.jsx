import { StyleSheet, View } from 'react-native';
import AppText from '../common/AppText';
import Badge from '../common/Badge';
import Icon from '../icons/Icon';
import TitledCard from '../common/TitledCard';
import { colors, radius, spacing } from '../../theme';
import { ms } from '../../utils/responsive';
import { formatDate, formatINR } from '../../utils/format';
import { useT } from '../../i18n';

const DOT = ms(32);

// '2026-02-07…' -> '07 Feb 2026'; other formats from the challan source as they are.
const showDate = value =>
  /^\d{4}-\d{2}-\d{2}/.test(value) ? formatDate(value.slice(0, 10)) : value;

// How each outcome looks: badge, icon and colours (a failed check never reads
// as "no challans").
const OUTCOME = {
  CLEAN: {
    tone: 'success',
    icon: 'check',
    color: colors.success,
    bg: colors.successLight,
  },
  FOUND: {
    tone: 'danger',
    icon: 'flash',
    color: colors.danger,
    bg: colors.dangerLight,
  },
  NOT_FOUND: {
    tone: 'neutral',
    icon: 'document',
    color: colors.muted,
    bg: colors.input,
  },
  UNAVAILABLE: {
    tone: 'warning',
    icon: 'clock',
    color: colors.warning,
    bg: colors.warningLight,
  },
};

// One challan: what for, when and where, and the fine.
function ChallanRow({ item, first }) {
  const t = useT();
  const meta = [item.date ? showDate(item.date) : null, item.authority]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={[styles.item, !first && styles.itemDivider]}>
      <View style={styles.flex}>
        <AppText variant="label" color={colors.heading}>
          {item.violation || t('challans.violationUnknown')}
        </AppText>
        {meta ? (
          <AppText variant="caption" style={styles.meta}>
            {meta}
          </AppText>
        ) : null}
        {item.status ? (
          <AppText variant="caption" style={styles.meta}>
            {item.status}
          </AppText>
        ) : null}
      </View>
      {item.fine != null ? (
        <AppText variant="label" color={colors.danger}>
          {formatINR(item.fine)}
        </AppText>
      ) : null}
    </View>
  );
}

// Traffic challans (as the web's ChallanSection, ADR-0050), shared by the
// inspection report and the vehicle page: clean / found (how many, total fine
// and - unless compact - each one) / no record / check unavailable, with when
// it was checked. challans: mapChallans(); compact: summary only (vehicle page).
function ChallanCard({ challans, compact = false, style }) {
  const t = useT();
  const look = OUTCOME[challans.outcome] ?? OUTCOME.UNAVAILABLE;
  const pending = challans.pendingCount ?? challans.items.length;
  const found = challans.outcome === 'FOUND';

  return (
    <TitledCard
      title={t('challans.title')}
      right={
        <Badge
          label={t(`challans.badge.${challans.outcome}`, { count: pending })}
          tone={look.tone}
          size="sm"
        />
      }
      style={style}
    >
      <View style={[styles.summary, { backgroundColor: look.bg }]}>
        <View style={[styles.dot, { backgroundColor: colors.white }]}>
          <Icon
            name={look.icon}
            size={ms(16)}
            color={look.color}
            strokeWidth={2.5}
          />
        </View>
        <View style={styles.flex}>
          <AppText variant="label" color={colors.heading}>
            {found
              ? t('challans.found', { count: pending })
              : t(`challans.${challans.outcome}`)}
          </AppText>
          {found && challans.totalFine != null ? (
            <AppText variant="caption" color={colors.body} style={styles.meta}>
              {t('challans.totalFine', {
                amount: formatINR(challans.totalFine),
              })}
            </AppText>
          ) : null}
          {challans.outcome === 'UNAVAILABLE' ? (
            <AppText variant="caption" color={colors.body} style={styles.meta}>
              {t('challans.unavailableNote')}
            </AppText>
          ) : null}
        </View>
      </View>

      {found && !compact
        ? challans.items.map((item, i) => (
            <ChallanRow key={item.number ?? i} item={item} first={i === 0} />
          ))
        : null}

      {challans.checkedAt ? (
        <AppText variant="caption" style={styles.checked}>
          {t(
            challans.outcome === 'CLEAN'
              ? 'challans.checkedClean'
              : 'challans.checked',
            {
              date: showDate(challans.checkedAt),
            },
          )}
        </AppText>
      ) : null}
    </TitledCard>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  meta: {
    marginTop: spacing.xxs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  checked: {
    marginTop: spacing.md,
  },
});

export default ChallanCard;
