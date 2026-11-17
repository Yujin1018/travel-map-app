import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { FillButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMapboxPublicToken } from '@/lib/mapbox';
import {
  formatPlaceContext,
  isSearchableQuery,
  searchErrorMessage,
  searchPlaces,
  type GeocodedPlace,
} from '@/lib/mapbox-search';
import type { AddPlaceResult } from '@/state/itinerary-context';
import type { PlaceDraft } from '@/types/itinerary';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'message'; text: string; tone: 'info' | 'danger' };

export function PlaceSearch({
  dayLabel,
  proximity,
  onAddToWishlist,
  onAddToDay,
}: {
  dayLabel: string;
  proximity: { latitude: number; longitude: number } | null;
  onAddToWishlist: (place: PlaceDraft) => AddPlaceResult;
  onAddToDay: (place: PlaceDraft) => AddPlaceResult;
}) {
  const theme = useTheme();
  const token = getMapboxPublicToken();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [status, setStatus] = useState<Status>(
    token ? { kind: 'idle' } : { kind: 'message', text: searchErrorMessage('missing-token'), tone: 'danger' },
  );
  useEffect(() => {
    if (!token) {
      setResults([]);
      setStatus({ kind: 'message', text: searchErrorMessage('missing-token'), tone: 'danger' });
      return;
    }
    const text = query.trim();
    if (!isSearchableQuery(text)) {
      setResults([]);
      setStatus({ kind: 'idle' });
      return;
    }

    setResults([]);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setStatus({ kind: 'loading' });
      void searchPlaces(text, {
        token,
        limit: 5,
        autocomplete: true,
        proximity,
        signal: controller.signal,
      }).then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        if (!result.ok) {
          if (result.reason === 'aborted') {
            return;
          }
          setResults([]);
          setStatus({ kind: 'message', text: searchErrorMessage(result.reason), tone: 'danger' });
          return;
        }
        setResults(result.places);
        setStatus(result.places.length === 0 ? { kind: 'empty' } : { kind: 'idle' });
      });
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [proximity, query, token]);

  function add(place: GeocodedPlace, destination: 'wishlist' | 'day') {
    const outcome = destination === 'wishlist' ? onAddToWishlist(toDraft(place)) : onAddToDay(toDraft(place));
    if (outcome === 'invalid') {
      setStatus({ kind: 'message', text: '这个结果缺少可用的名称或坐标。', tone: 'danger' });
      return;
    }
    if (outcome === 'duplicate') {
      setStatus({ kind: 'message', text: `「${place.name}」已经在行程或想去列表里。`, tone: 'danger' });
      return;
    }
    const where = destination === 'wishlist' ? '想去的地点' : dayLabel;
    setStatus({ kind: 'message', text: `已把${place.name}加入${where}。`, tone: 'info' });
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">搜索地点</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        输入名称，从结果里选一个。可以放进想去列表，或直接加到{dayLabel}。
      </ThemedText>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="例如 清水寺、浅草寺"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        enterKeyHint="search"
        style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
      />
      {status.kind === 'loading' ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
          正在搜索…
        </ThemedText>
      ) : null}
      {status.kind === 'empty' ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          没有找到相关地点，换个名称再试试。
        </ThemedText>
      ) : null}
      {status.kind === 'message' ? (
        <ThemedText
          type="small"
          accessibilityLiveRegion="polite"
          style={{ color: status.tone === 'danger' ? theme.danger : theme.text }}>
          {status.text}
        </ThemedText>
      ) : null}
      <View style={styles.results}>
        {results.map((place) => {
          const context = formatPlaceContext(place);
          return (
            <View key={place.mapboxId} style={[styles.result, { borderColor: theme.backgroundSelected }]}>
              <View style={styles.copy}>
                <ThemedText type="smallBold">{place.name}</ThemedText>
                {context ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {context}
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.actions}>
                <FillButton label="加入想去" onPress={() => add(place, 'wishlist')} />
                <FillButton label="加到当天" tone="secondary" onPress={() => add(place, 'day')} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function toDraft(place: GeocodedPlace): PlaceDraft {
  const note = formatPlaceContext(place);
  return {
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    mapboxId: place.mapboxId,
    note: note || undefined,
  };
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  results: {
    gap: Spacing.two,
  },
  result: {
    borderWidth: 1,
    borderRadius: 12,
    gap: Spacing.two,
    padding: Spacing.two,
  },
  copy: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
