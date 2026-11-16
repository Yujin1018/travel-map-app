import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DayPlan, SampleLeg } from '@/types/itinerary';

function findSampleLeg(day: DayPlan, fromStopId: string, toStopId: string): SampleLeg | undefined {
  return day.sampleLegs.find((leg) => leg.fromStopId === fromStopId && leg.toStopId === toStopId);
}

function ActionButton({
  label,
  disabled,
  onPress,
  danger = false,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: theme.backgroundSelected,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: danger ? theme.danger : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function StopList({
  day,
  onMove,
  onRemove,
}: {
  day: DayPlan;
  onMove: (stopId: string, direction: -1 | 1) => void;
  onRemove: (stopId: string) => void;
}) {
  const theme = useTheme();

  if (day.stops.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">这一天还没有地点</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          在下面填名称和经纬度，地点会加到这一天的最后。
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {day.stops.map((stop, index) => {
        const previous = day.stops[index - 1];
        const leg = previous ? findSampleLeg(day, previous.id, stop.id) : undefined;

        return (
          <View key={stop.id} style={styles.item}>
            {previous ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.leg}>
                {leg ? `${leg.label} · ${leg.minutes} 分钟` : '这两站之间还没有填写用时'}
              </ThemedText>
            ) : null}
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.index, { backgroundColor: theme.accent }]}>
                <ThemedText type="smallBold" style={styles.indexText}>
                  {index + 1}
                </ThemedText>
              </View>
              <View style={styles.copy}>
                <ThemedText type="smallBold">{stop.name}</ThemedText>
                {stop.note ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {stop.note}
                  </ThemedText>
                ) : null}
                <ThemedText type="small" themeColor="textSecondary">
                  {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                </ThemedText>
                <View style={styles.actions}>
                  <ActionButton label="上移" disabled={index === 0} onPress={() => onMove(stop.id, -1)} />
                  <ActionButton
                    label="下移"
                    disabled={index === day.stops.length - 1}
                    onPress={() => onMove(stop.id, 1)}
                  />
                  <ActionButton label="删除" danger onPress={() => onRemove(stop.id)} />
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  item: {
    gap: Spacing.two,
  },
  leg: {
    paddingLeft: 44,
  },
  card: {
    borderRadius: 16,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: '#ffffff',
  },
  copy: {
    flex: 1,
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  action: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderRadius: 16,
    gap: Spacing.one,
    padding: Spacing.three,
  },
});
