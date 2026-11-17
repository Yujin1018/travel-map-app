import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DayPlan, SampleLeg } from '@/types/itinerary';

function findSampleLeg(day: DayPlan, fromStopId: string, toStopId: string): SampleLeg | undefined {
  return day.sampleLegs.find((leg) => leg.fromStopId === fromStopId && leg.toStopId === toStopId);
}

export function StopList({
  day,
  otherDays,
  onMove,
  onRemove,
  onMoveToDay,
  onMoveToWishlist,
  emptyHint,
}: {
  day: DayPlan;
  otherDays: { id: string; dateLabel: string }[];
  onMove: (stopId: string, direction: -1 | 1) => void;
  onRemove: (stopId: string) => void;
  onMoveToDay: (stopId: string, dayId: string) => void;
  onMoveToWishlist: (stopId: string) => void;
  emptyHint: string;
}) {
  const theme = useTheme();

  if (day.stops.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">这一天还没有地点</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {emptyHint}
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
            {leg ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.leg}>
                {leg.label} · {leg.minutes} 分钟
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
                  <ActionButton label="移回想去" onPress={() => onMoveToWishlist(stop.id)} />
                  {otherDays.map((other) => (
                    <ActionButton
                      key={other.id}
                      label={`移到${other.dateLabel}`}
                      onPress={() => onMoveToDay(stop.id, other.id)}
                    />
                  ))}
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
  empty: {
    borderRadius: 16,
    gap: Spacing.one,
    padding: Spacing.three,
  },
});
