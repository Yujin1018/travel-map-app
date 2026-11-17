import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { SessionPlaceRefresh } from '@/components/session-place-refresh';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hasCoordinates } from '@/lib/places';
import type { AddPlaceResult } from '@/state/itinerary-context';
import type { PlaceDraft, Stop } from '@/types/itinerary';

export function WishlistList({
  places,
  days,
  onMoveToDay,
  onRemove,
  onAttachSession,
  onSaveManual,
  proximity,
}: {
  places: Stop[];
  days: { id: string; dateLabel: string }[];
  onMoveToDay: (stopId: string, dayId: string) => 'moved' | 'duplicate' | 'missing';
  onRemove: (stopId: string) => void;
  onAttachSession: (place: PlaceDraft) => AddPlaceResult;
  onSaveManual: (stopId: string, latitude: number, longitude: number) => 'saved' | 'invalid' | 'missing';
  proximity: { latitude: number; longitude: number } | null;
}) {
  const theme = useTheme();
  const [message, setMessage] = useState('');

  if (places.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">想去的地点</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          还没有想去的地点。搜索或从帖子导入后可以放在这里，再用智能分配排到各天。
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <ThemedText type="smallBold">想去的地点 · {places.length}</ThemedText>
      {message ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
          {message}
        </ThemedText>
      ) : null}
      {places.map((place) => (
        <View key={place.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">{place.name}</ThemedText>
          {place.note ? (
            <ThemedText type="small" themeColor="textSecondary">
              {place.note}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {hasCoordinates(place)
              ? `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}${place.coordinateSource === 'mapbox' ? ' · 仅本次打开' : ''}`
              : '重新打开后还没画上。搜索结果不能保存。'}
          </ThemedText>
          {!hasCoordinates(place) ? (
            <SessionPlaceRefresh
              query={place.name}
              proximity={proximity}
              onAttach={onAttachSession}
              onSaveManual={(latitude, longitude) => onSaveManual(place.id, latitude, longitude)}
            />
          ) : null}
          <View style={styles.actions}>
            {days.map((day) => (
              <ActionButton
                key={day.id}
                label={`加到${day.dateLabel}`}
                onPress={() => {
                  const result = onMoveToDay(place.id, day.id);
                  setMessage(
                    result === 'moved'
                      ? `已把${place.name}加到${day.dateLabel}。`
                      : result === 'duplicate'
                        ? `「${place.name}」已经在${day.dateLabel}里。`
                        : '没有找到这个地点。',
                  );
                }}
              />
            ))}
            <ActionButton
              label="移除"
              danger
              onPress={() => {
                onRemove(place.id);
                setMessage(`已移除${place.name}。`);
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: 16,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
