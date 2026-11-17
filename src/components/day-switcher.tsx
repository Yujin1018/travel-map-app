import { Pressable, StyleSheet, View } from 'react-native';

import { FillButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DayPlan } from '@/types/itinerary';

export function DaySwitcher({
  days,
  activeDayId,
  onSelect,
  onAdd,
}: {
  days: DayPlan[];
  activeDayId: string;
  onSelect: (dayId: string) => void;
  onAdd?: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const selected = day.id === activeDayId;
        const label = day.title !== day.dateLabel ? `${day.dateLabel} · ${day.title}` : day.dateLabel;
        return (
          <Pressable
            key={day.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`选择${day.dateLabel}`}
            onPress={() => onSelect(day.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? theme.accent : theme.backgroundElement,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <ThemedText type="smallBold" numberOfLines={1} style={{ color: selected ? '#ffffff' : theme.text }}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
      {onAdd ? <FillButton label="加一天" tone="secondary" onPress={onAdd} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 44,
    maxWidth: 220,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
