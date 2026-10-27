import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../../../components';
import { colors, radius, spacing } from '../../../../theme';
import { fs, ms } from '../../../../utils/responsive';
import { useT } from '../../../../i18n';

const pad = n => String(n).padStart(2, '0');

// 14:00 -> "2:00 PM"
export const clockLabel = time => {
  const date = new Date(time);
  const hours = date.getHours();
  return `${hours % 12 || 12}:${pad(date.getMinutes())} ${
    hours < 12 ? 'AM' : 'PM'
  }`;
};

const DayChip = memo(function DayChip({ day, selected, onPress }) {
  const t = useT();
  const date = new Date(day.time);
  return (
    <Pressable
      onPress={() => onPress(day.key)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.day,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <AppText
        variant="caption"
        color={selected ? colors.primary : colors.body}
      >
        {t(`common.day.${date.getDay()}`)}
      </AppText>
      <AppText
        variant="h3"
        color={selected ? colors.primary : colors.heading}
        style={styles.dayNumber}
      >
        {date.getDate()}
      </AppText>
      <AppText
        variant="caption"
        color={selected ? colors.primary : colors.placeholder}
        style={styles.month}
      >
        {t(`common.month.${date.getMonth()}`)}
      </AppText>
    </Pressable>
  );
});

const TimeChip = memo(function TimeChip({ slot, selected, onPress }) {
  const full = !slot.available;
  return (
    <Pressable
      onPress={() => onPress(slot)}
      disabled={full}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: full }}
      style={({ pressed }) => [
        styles.time,
        selected && styles.selected,
        full && styles.full,
        pressed && styles.pressed,
      ]}
    >
      <AppText
        variant="label"
        color={selected ? colors.primary : colors.heading}
      >
        {clockLabel(slot.time)}
      </AppText>
    </Pressable>
  );
});

// Day chips (scroll sideways), then that day's times. Full times are dimmed
// and can't be picked.
function SlotPicker({ days, dayKey, slotAt, onDayChange, onSlotChange }) {
  const t = useT();
  const day = days.find(d => d.key === dayKey);
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.days}
      >
        {days.map(d => (
          <DayChip
            key={d.key}
            day={d}
            selected={d.key === dayKey}
            onPress={onDayChange}
          />
        ))}
      </ScrollView>
      {day?.slots.length ? (
        <View style={styles.times}>
          {day.slots.map(slot => (
            <TimeChip
              key={slot.slotAt}
              slot={slot}
              selected={slot.slotAt === slotAt}
              onPress={onSlotChange}
            />
          ))}
        </View>
      ) : (
        <AppText variant="subtitle" style={styles.noTimes}>
          {t('booking.slots.noTimes')}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  days: {
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  day: {
    width: ms(62),
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
  },
  dayNumber: {
    fontSize: fs(18),
    lineHeight: fs(24),
  },
  month: {
    fontSize: fs(10),
    lineHeight: fs(13),
  },
  times: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  time: {
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.dangerLight,
  },
  full: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  noTimes: {
    marginTop: spacing.md,
  },
});

export default memo(SlotPicker);
